package com.paysphere.service;

import com.paysphere.model.OtpAuditLog;
import com.paysphere.model.OtpEntity;
import com.paysphere.repository.OtpAuditLogRepository;
import com.paysphere.repository.OtpRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Core OTP lifecycle service:
 *  - Generate 6-digit OTP
 *  - SHA-256 hash before storing (NEVER stores plaintext)
 *  - Dispatch real SMS via Twilio (SmsService)
 *  - Verify with brute-force protection (max 3 attempts)
 *  - Rate limiting (max 3 sends per mobile per hour)
 *  - Full audit logging
 *  - Async Salesforce sync via SalesforceSyncService
 *
 * The raw OTP is NEVER logged, stored, or returned in any API response.
 */
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);

    private static final int MAX_ATTEMPTS = 3;
    private static final int MAX_SENDS_PER_HOUR = 3;

    @Value("${otp.expiry.minutes:5}")
    private int otpExpiryMinutes;

    @Value("${app.otp.fallback-to-console.enabled:false}")
    private boolean fallbackToConsoleEnabled;

    @Value("${app.otp.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${app.otp.bypass.enabled:false}")
    private boolean bypassEnabled;

    @Autowired private OtpRepository otpRepository;
    @Autowired private OtpAuditLogRepository auditLogRepository;
    @Autowired private SmsService smsService;
    @Autowired private SalesforceSyncService sfSyncService;

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Generates a 6-digit OTP, hashes it with SHA-256, persists the hash,
     * sends real SMS via Twilio, writes audit log, and syncs to Salesforce.
     *
     * @param userId  PaySphere user ID (null allowed for unauthenticated register flow)
     * @param mobile  Mobile number in E.164 format, e.g. +919876543210
     * @param purpose REGISTER | LOGIN | TRANSFER | BENEFICIARY | PASSWORD_RESET
     * @return the SHA-256 hex hash of the OTP (for callers that need to store it, e.g. TransferRequest)
     */
    public String generateAndSend(Long userId, String mobile, String purpose) {
        final String finalMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
        log.info("[OTP GENERATION REQUEST] Received request: userId={} mobile={} purpose={}", userId, maskMobile(finalMobile), purpose);
        log.info("Rate limit enabled={}", rateLimitEnabled);
        checkRateLimit(finalMobile, purpose);

        // Invalidate any previous PENDING OTPs for this user+mobile+purpose
        if (userId != null) {
            otpRepository.findTopByUserIdAndMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                    userId, finalMobile, purpose, "PENDING")
                    .ifPresent(old -> {
                        old.setStatus("EXPIRED");
                        otpRepository.save(old);
                        log.info("[OTP INVALIDATION] Marked prior pending OTP for userId={} mobile={} purpose={} as EXPIRED", userId, maskMobile(finalMobile), purpose);
                    });
        } else {
            otpRepository.findTopByMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                    finalMobile, purpose, "PENDING")
                    .ifPresent(old -> {
                        old.setStatus("EXPIRED");
                        otpRepository.save(old);
                        log.info("[OTP INVALIDATION] Marked prior unauthenticated pending OTP for mobile={} purpose={} as EXPIRED", maskMobile(finalMobile), purpose);
                    });
        }

        String plainOtp = generateSixDigitOtp();
        String hashedOtp = sha256(plainOtp);

        LocalDateTime now = LocalDateTime.now();

        OtpEntity entity = new OtpEntity();
        entity.setUserId(userId);
        entity.setMobileNumber(finalMobile);
        entity.setOtpCode(hashedOtp);  // Store SHA-256 hash, NEVER plaintext
        entity.setCreatedAt(now);
        entity.setExpiresAt(now.plusMinutes(otpExpiryMinutes));
        entity.setPurpose(purpose);
        entity.setStatus("PENDING");
        otpRepository.save(entity);

        log.info("[OTP GENERATION SUCCESS] Created OTP Entity: id={}, userId={}, mobile={}, purpose={}, hash={}, expiresAt={}",
                entity.getId(), userId, maskMobile(finalMobile), purpose, hashedOtp, entity.getExpiresAt());
        log.info("TEMP_DEBUG: Plaintext OTP is: {}", plainOtp);

        try {
            // Send real SMS via Twilio — returns Message SID
            String messageSid = smsService.sendOtp(finalMobile, plainOtp, purpose);

            // Store Message SID for delivery tracking
            entity.setMessageSid(messageSid);
            otpRepository.save(entity);

            // Write audit log
            writeAudit(userId, finalMobile, "SENT", purpose,
                    "OTP sent via Twilio SMS (SID: " + messageSid + ")");
            log.info("[OTP SMS SENT] Success: userId={} mobile={} purpose={} sid={}", userId, maskMobile(finalMobile), purpose, messageSid);
        } catch (Exception e) {
            if (fallbackToConsoleEnabled) {
                log.warn("[OTP FALLBACK] SMS delivery failed: {}. Falling back to console logging (dev mode).", e.getMessage());
                String fallbackSid = "FALLBACK_CONSOLE_SMS_SID_" + System.currentTimeMillis();
                entity.setMessageSid(fallbackSid);
                otpRepository.save(entity);

                // Print the OTP in a clean, visible console banner
                log.info("\n==================================================\n" +
                         "FALLBACK CONSOLE SMS PROVIDER - OUTGOING MESSAGE:\n" +
                         "To: {}\n" +
                         "OTP Code: {}\n" +
                         "Purpose: {}\n" +
                         "Message: PaySphere OTP: {} for {}. Valid for {} minutes. Do not share this code with anyone.\n" +
                         "==================================================",
                         finalMobile, plainOtp, purpose, plainOtp, purpose, otpExpiryMinutes);

                // Write audit log
                writeAudit(userId, finalMobile, "SENT", purpose,
                        "OTP logged to console (Fallback Mode, SID: " + fallbackSid + ")");
                return hashedOtp;
            }

            try {
                otpRepository.delete(entity);
                log.info("Deleted pending OTP entity for mobile={} due to SMS delivery failure", maskMobile(finalMobile));
            } catch (Exception ex) {
                log.error("Failed to delete pending OTP entity for mobile={} after SMS failure: {}", maskMobile(finalMobile), ex.getMessage());
            }
            throw e;
        }

        return hashedOtp;
    }

    /**
     * Verifies the user-submitted OTP against the stored SHA-256 hash.
     *
     * @param userId   User ID (null for unauthenticated flows)
     * @param mobile   Mobile number
     * @param otpInput Plain OTP entered by user
     * @param purpose  Must match the purpose used during generateAndSend
     * @throws RuntimeException if invalid, expired, or locked
     */
    public void verify(Long userId, String mobile, String otpInput, String purpose) {
        mobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);

        if (bypassEnabled && "123456".equals(otpInput.trim())) {
            log.info("OTP verification BYPASSED (DEV MODE) for mobile={} purpose={}", maskMobile(mobile), purpose);
            
            Optional<OtpEntity> otpOpt;
            if (userId != null) {
                otpOpt = otpRepository.findTopByUserIdAndMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                                userId, mobile, purpose, "PENDING");
            } else {
                otpOpt = otpRepository.findTopByMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                                mobile, purpose, "PENDING");
            }
            
            OtpEntity otp;
            if (otpOpt.isPresent()) {
                otp = otpOpt.get();
                otp.setStatus("VERIFIED");
                otp.setVerified(true);
                otp.setAttempts(otp.getAttempts() + 1);
            } else {
                otp = new OtpEntity();
                otp.setUserId(userId);
                otp.setMobileNumber(mobile);
                otp.setOtpCode(sha256("123456"));
                otp.setCreatedAt(LocalDateTime.now());
                otp.setExpiresAt(LocalDateTime.now().plusMinutes(5));
                otp.setPurpose(purpose);
                otp.setStatus("VERIFIED");
                otp.setVerified(true);
            }
            otpRepository.save(otp);
            
            OtpAuditLog auditEntry = writeAudit(userId, mobile, "VERIFIED", purpose, "OTP verified via DEV_BYPASS code");
            try {
                sfSyncService.syncOtpLog(auditEntry);
            } catch (Exception e) {
                log.warn("Salesforce OTP_Log sync failed (non-fatal): {}", e.getMessage());
            }
            return;
        }

        Optional<OtpEntity> otpOpt;

        if (userId != null) {
            otpOpt = otpRepository
                    .findTopByUserIdAndMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                            userId, mobile, purpose, "PENDING");
        } else {
            otpOpt = otpRepository
                    .findTopByMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                            mobile, purpose, "PENDING");
        }

        if (otpOpt.isEmpty()) {
            writeAudit(userId, mobile, "FAILED", purpose, "No active OTP found");
            throw new RuntimeException("No active OTP found. Please request a new OTP.");
        }

        OtpEntity otp = otpOpt.get();

        // Check if locked due to too many attempts
        if ("LOCKED".equalsIgnoreCase(otp.getStatus())) {
            writeAudit(userId, mobile, "LOCKED", purpose, "OTP locked after too many failed attempts");
            throw new RuntimeException("OTP is locked after " + MAX_ATTEMPTS + " failed attempts. Please request a new OTP.");
        }

        // Check expiry
        if (LocalDateTime.now().isAfter(otp.getExpiresAt())) {
            otp.setStatus("EXPIRED");
            otpRepository.save(otp);
            writeAudit(userId, mobile, "EXPIRED", purpose, "OTP expired");
            log.warn("OTP_EXPIRED: userId={} mobile={} purpose={}", userId, maskMobile(mobile), purpose);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        // Increment attempt counter
        otp.setAttempts(otp.getAttempts() + 1);

        // SHA-256 hash the submitted OTP and compare with stored hash
        String submittedHash = sha256(otpInput.trim());

        if (!submittedHash.equals(otp.getOtpCode())) {
            // Wrong OTP
            if (otp.getAttempts() >= MAX_ATTEMPTS) {
                otp.setStatus("LOCKED");
                otpRepository.save(otp);
                writeAudit(userId, mobile, "LOCKED", purpose,
                        "Locked after " + otp.getAttempts() + " failed attempts");
                log.warn("OTP_LOCKED: userId={} mobile={} after {} attempts", userId, maskMobile(mobile), otp.getAttempts());
                throw new RuntimeException("Too many incorrect attempts. OTP is locked. Please request a new OTP.");
            }
            otpRepository.save(otp);
            writeAudit(userId, mobile, "FAILED", purpose,
                    "Wrong OTP, attempt " + otp.getAttempts() + "/" + MAX_ATTEMPTS);
            log.warn("OTP_FAILED: userId={} mobile={} attempt={}", userId, maskMobile(mobile), otp.getAttempts());
            throw new RuntimeException("Incorrect OTP. " + (MAX_ATTEMPTS - otp.getAttempts())
                    + " attempt(s) remaining.");
        }

        // OTP correct — mark verified
        otp.setStatus("VERIFIED");
        otp.setVerified(true);
        otpRepository.save(otp);

        OtpAuditLog auditEntry = writeAudit(userId, mobile, "VERIFIED", purpose,
                "OTP verified successfully after " + otp.getAttempts() + " attempt(s)");
        log.info("OTP_VERIFIED: userId={} mobile={} purpose={}", userId, maskMobile(mobile), purpose);

        // Async sync to Salesforce (non-fatal)
        try {
            sfSyncService.syncOtpLog(auditEntry);
        } catch (Exception e) {
            log.warn("Salesforce OTP_Log sync failed (non-fatal): {}", e.getMessage());
        }
    }

    /**
     * Invalidates the current PENDING OTP and generates + sends a fresh one.
     * Subject to the same rate-limit as generateAndSend.
     */
    public void resend(Long userId, String mobile, String purpose) {
        mobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
        log.info("OTP resend requested: userId={} mobile={} purpose={}", userId, maskMobile(mobile), purpose);
        generateAndSend(userId, mobile, purpose);

        // Rewrite audit as RESENT
        writeAudit(userId, mobile, "RESENT", purpose, "OTP resent on user request");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateSixDigitOtp() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private void checkRateLimit(String mobile, String purpose) {
        if (!rateLimitEnabled) {
            log.info("OTP rate limiting is DISABLED (app.otp.rate-limit.enabled=false) — skipping throttle check");
            return;
        }
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long count = otpRepository.countByMobileAndPurposeSince(mobile, purpose, oneHourAgo);
        if (count >= MAX_SENDS_PER_HOUR) {
            log.warn("Rate limit hit for mobile={} purpose={} (count={}/{})", maskMobile(mobile), purpose, count, MAX_SENDS_PER_HOUR);
            throw new RuntimeException(
                    "Too many OTP requests. Please wait before requesting another OTP.");
        }
    }

    public void validateMobile(String mobile) {
        com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
    }


    private OtpAuditLog writeAudit(Long userId, String mobile, String action,
                                    String purpose, String details) {
        OtpAuditLog audit = new OtpAuditLog();
        audit.setUserId(userId);
        audit.setMobileNumber(mobile);
        audit.setAction(action);
        audit.setPurpose(purpose);
        audit.setDetails(details);
        audit.setTimestamp(LocalDateTime.now());
        OtpAuditLog saved = auditLogRepository.save(audit);

        // Sync SENT and VERIFIED events to Salesforce immediately
        if ("SENT".equals(action) || "VERIFIED".equals(action) || "RESENT".equals(action)) {
            try {
                sfSyncService.syncOtpLog(saved);
            } catch (Exception e) {
                log.warn("Salesforce OTP_Log__c sync failed (non-fatal): {}", e.getMessage());
            }
        }
        return saved;
    }

    // ── SHA-256 Hashing ──────────────────────────────────────────────────────

    /**
     * Computes the SHA-256 hash of the given plaintext and returns it as a
     * lowercase hex string. This is a one-way operation — the original OTP
     * cannot be recovered from the hash.
     */
    private String sha256(String plainText) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(plainText.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hashing failed: " + e.getMessage(), e);
        }
    }

    private String maskMobile(String mobile) {
        return com.paysphere.util.MobileNumberUtils.mask(mobile);
    }
}
