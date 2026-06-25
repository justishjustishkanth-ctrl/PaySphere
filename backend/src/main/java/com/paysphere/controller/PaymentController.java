package com.paysphere.controller;

import com.paysphere.model.*;
import com.paysphere.repository.*;
import com.paysphere.service.OtpService;
import com.paysphere.service.SalesforceSyncService;
import com.paysphere.service.SmsService;
import com.paysphere.service.ReceiptService;
import java.util.HashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Handles transfer requests, OTP generation/validation, and payment capture
 * with Razorpay signature verification. Integrates with Salesforce sync.
 *
 * Endpoints:
 *   POST /api/transfer-requests              - create transfer request + generate OTP
 *   GET  /api/transfer-requests              - list transfer requests (optionally by userId)
 *   POST /api/transfer-requests/{id}/otp/validate - validate OTP for a transfer request
 *   POST /api/payments                       - capture payment (blocks if OTP not verified)
 *   GET  /api/payments                       - list all payments
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);
    private static final int OTP_EXPIRY_MINUTES = 5;

    @Autowired private PaymentRepository paymentRepository;
    @Autowired private TransferRequestRepository transferRequestRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BeneficiaryRepository beneficiaryRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private SalesforceSyncService syncService;
    @Autowired private OtpService otpService;
    @Autowired private SmsService smsService;
    @Autowired private ReceiptService receiptService;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    // ── Transfer Request + OTP Generation ─────────────────────────────────────

    @PostMapping("/transfer-requests")
    public ResponseEntity<?> createTransferRequest(@RequestBody TransferRequest request) {
        Optional<User> userOpt = userRepository.findById(request.getUser().getId());
        Optional<Beneficiary> benOpt = beneficiaryRepository.findById(request.getBeneficiary().getId());

        if (userOpt.isEmpty() || benOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User or Beneficiary not found");
        }

        User user = userOpt.get();
        Beneficiary beneficiary = benOpt.get();

        request.setUser(user);
        request.setBeneficiary(beneficiary);

        // Set status before OTP dispatch
        request.setOtpGeneratedAt(LocalDateTime.now());
        request.setStatus("PENDING_OTP");

        String formattedMobile;
        try {
            formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(user.getMobile());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Please enter a valid Indian mobile number");
        }

        // Dispatch real OTP SMS via OtpService (generates, hashes, stores, sends Twilio SMS)
        // Returns the SHA-256 hash — raw OTP is never exposed here
        String hashedOtp;
        try {
            hashedOtp = otpService.generateAndSend(user.getId(), formattedMobile, "TRANSFER");
            log.info("Transfer OTP SMS dispatched → userId={} transferId=pending", user.getId());
        } catch (Exception e) {
            log.error("Transfer OTP SMS failed: {}", e.getMessage());
            return ResponseEntity.status(500).body(Map.of(
                    "error", "OTP could not be sent: " + e.getMessage()));
        }

        // Store only the hashed OTP on the transfer request
        request.setOtp(hashedOtp);
        TransferRequest saved = transferRequestRepository.save(request);
        log.info("TransferRequest {} created with hashed OTP (status=PENDING_OTP)", saved.getId());

        // Always save in-app notification too
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setType("TRANSFER");
        notification.setMessage(
                "OTP has been sent via SMS for transfer request #" + saved.getId() +
                " of " + request.getSourceCurrency() + " " + request.getAmount() +
                ". Check your mobile. Valid for 5 minutes."
        );
        notificationRepository.save(notification);

        // Async Salesforce sync (non-fatal)
        syncService.syncUser(user);
        syncService.syncBeneficiary(beneficiary);
        syncService.syncTransferRequest(saved);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/transfer-requests")
    public List<TransferRequest> getTransferRequests(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return transferRequestRepository.findByUserId(userId);
        }
        return transferRequestRepository.findAll();
    }

    // ── OTP Validation ─────────────────────────────────────────────────────────

    @PostMapping("/transfer-requests/{id}/otp/validate")
    public ResponseEntity<?> validateOtp(@PathVariable Long id,
                                          @RequestBody Map<String, String> body) {
        Optional<TransferRequest> trOpt = transferRequestRepository.findById(id);
        if (trOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Transfer request not found");
        }

        TransferRequest tr = trOpt.get();

        if (!"PENDING_OTP".equalsIgnoreCase(tr.getStatus())) {
            return ResponseEntity.badRequest().body(
                    "OTP already used or transfer is in status: " + tr.getStatus());
        }

        // Check expiry
        if (tr.getOtpGeneratedAt() == null ||
                tr.getOtpGeneratedAt().plusMinutes(OTP_EXPIRY_MINUTES).isBefore(LocalDateTime.now())) {
            tr.setStatus("FAILED");
            transferRequestRepository.save(tr);
            log.warn("OTP expired for transferRequestId={}", id);
            return ResponseEntity.badRequest().body("OTP has expired. Please create a new transfer request.");
        }

        String formattedMobile;
        try {
            formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(tr.getUser().getMobile());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Please enter a valid Indian mobile number");
        }

        String submittedOtp = body.getOrDefault("otp", "").trim();
        try {
            otpService.verify(tr.getUser().getId(), formattedMobile, submittedOtp, "TRANSFER");
        } catch (Exception e) {
            log.warn("OTP mismatch or error for transferRequestId={}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        // OTP verified — advance status
        tr.setStatus("PENDING_PAYMENT");
        tr.setOtp(null); // Clear OTP after successful validation for security
        TransferRequest updated = transferRequestRepository.save(tr);
        log.info("OTP verified for transferRequestId={}, status→PENDING_PAYMENT", id);

        // Notify user
        Notification notification = new Notification();
        notification.setUser(tr.getUser());
        notification.setType("TRANSFER");
        notification.setMessage("OTP verified for transfer request #" + id + ". Proceed to payment.");
        notificationRepository.save(notification);

        // Sync updated status to Salesforce
        syncService.syncTransferRequest(updated);

        return ResponseEntity.ok(Map.of(
                "message", "OTP verified successfully. Proceed to payment.",
                "transferRequestId", id,
                "status", "PENDING_PAYMENT"
        ));
    }

    // ── Payment Capture with Razorpay Signature Verification ──────────────────

    @PostMapping("/payments")
    public ResponseEntity<?> createPayment(@RequestBody Payment payment) {
        Long trId = (payment.getTransferRequest() != null) ? payment.getTransferRequest().getId() : null;
        log.info("Payment Capture Endpoint Called (/api/payments): transferRequestId={}, orderId={}, paymentId={}, signature={}, amount={}, status={}",
                trId, payment.getOrderId(), payment.getPaymentId(), payment.getSignature(), payment.getAmount(), payment.getStatus());

        Optional<TransferRequest> trOpt = transferRequestRepository.findById(payment.getTransferRequest().getId());
        if (trOpt.isEmpty()) {
            log.error("Payment Capture Failed: Transfer request #{} not found", trId);
            return ResponseEntity.badRequest().body("Transfer request not found");
        }

        TransferRequest tr = trOpt.get();

        // Block payment if OTP not yet verified
        if (!"PENDING_PAYMENT".equalsIgnoreCase(tr.getStatus())) {
            log.warn("Payment Capture Rejected: Transfer request #{} is in status '{}' (expected 'PENDING_PAYMENT')", trId, tr.getStatus());
            return ResponseEntity.badRequest().body(
                    "Payment not allowed. Transfer request status is: " + tr.getStatus() +
                    ". Please validate OTP first.");
        }

        // Razorpay signature verification (when orderId + paymentId + signature are present)
        String orderId   = payment.getOrderId();
        String paymentId = payment.getPaymentId();
        String signature = payment.getSignature();

        log.info("Razorpay signature verification input: orderId={}, paymentId={}, signature={}",
                orderId, paymentId, signature != null ? signature.substring(0, Math.min(16, signature.length())) + "..." : "null");

        if (orderId != null && paymentId != null && signature != null
                && !orderId.isBlank() && !paymentId.isBlank() && !signature.isBlank()) {
            String generatedSig = computeRazorpaySignature(orderId, paymentId);
            boolean valid = generatedSig != null && generatedSig.equalsIgnoreCase(signature);

            log.info("Razorpay signature verification details: orderId={}, paymentId={}, receivedSig={}, generatedSig={}, match={}",
                    orderId, paymentId, signature, generatedSig, valid);

            if (!valid) {
                log.warn("Razorpay signature verification FAILED for orderId={}. Result: Signature Verification Failed.", orderId);
                payment.setStatus("FAILED");
                // Still persist the failed attempt
                payment.setTransferRequest(tr);
                Payment failedPayment = paymentRepository.save(payment);
                tr.setStatus("FAILED");
                transferRequestRepository.save(tr);
                return ResponseEntity.badRequest().body(
                        Map.of("success", false,
                               "reason", "SIGNATURE_MISMATCH",
                               "receivedSignature", signature,
                               "generatedSignature", generatedSig != null ? generatedSig : "COMPUTATION_ERROR",
                               "paymentId", failedPayment.getId()));
            }
            log.info("Razorpay signature VERIFIED for orderId={}. Result: Signature Verification Succeeded.", orderId);
        } else {
            log.info("No Razorpay signature provided — proceeding as simulated/test payment");
        }

        payment.setTransferRequest(tr);
        Payment savedPayment = paymentRepository.save(payment);

        // Update transfer request status
        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            tr.setStatus("PROCESSING");
        } else {
            tr.setStatus("FAILED");
        }
        transferRequestRepository.save(tr);

        // Create transaction log
        Transaction transaction = new Transaction();
        transaction.setUser(tr.getUser());
        transaction.setTransferRequest(tr);
        transaction.setPayment(savedPayment);
        transaction.setAmount(payment.getAmount());
        transaction.setCurrency(tr.getSourceCurrency());
        transaction.setStatus(payment.getStatus());
        Transaction savedTx = transactionRepository.save(transaction);

        // Notify user
        Notification notification = new Notification();
        notification.setUser(tr.getUser());
        notification.setType("PAYMENT");
        notification.setMessage(
                "Payment of " + tr.getSourceCurrency() + " " + payment.getAmount() +
                " for transfer #" + tr.getId() + " is " + payment.getStatus().toLowerCase() + "."
        );
        notificationRepository.save(notification);

        // Salesforce sync
        syncService.syncTransferRequest(tr);
        syncService.syncPayment(savedPayment);
        if ("SUCCESS".equalsIgnoreCase(savedTx.getStatus())) {
            syncService.syncTransaction(savedTx);
        }

        log.info("Payment {} captured — status={}", savedPayment.getId(), payment.getStatus());

        // Automatic receipt generation
        Long receiptId = null;
        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            try {
                Receipt receipt = receiptService.generateReceipt(savedTx);
                receiptId = receipt.getId();
            } catch (Exception e) {
                log.error("Failed to automatically generate receipt for transaction ID: " + savedTx.getId(), e);
            }
        }

        Map<String, Object> responseMap = new HashMap<>();
        responseMap.put("id", savedPayment.getId());
        responseMap.put("transferRequest", savedPayment.getTransferRequest());
        responseMap.put("orderId", savedPayment.getOrderId());
        responseMap.put("paymentId", savedPayment.getPaymentId());
        responseMap.put("signature", savedPayment.getSignature());
        responseMap.put("amount", savedPayment.getAmount());
        responseMap.put("status", savedPayment.getStatus());
        responseMap.put("receiptId", receiptId);

        return ResponseEntity.ok(responseMap);
    }

    @GetMapping("/payments")
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    // ── Razorpay Signature Verification ───────────────────────────────────────

    /**
     * Computes the Razorpay payment signature using HMAC-SHA256.
     * The expected signature = HMAC_SHA256(orderId + "|" + paymentId, keySecret)
     *
     * @return hex-encoded HMAC-SHA256 digest, or null on error
     */
    private String computeRazorpaySignature(String orderId, String paymentId) {
        try {
            String data = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            // Convert to hex
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("Razorpay HMAC computation error: {}", e.getMessage());
            return null;
        }
    }
}
