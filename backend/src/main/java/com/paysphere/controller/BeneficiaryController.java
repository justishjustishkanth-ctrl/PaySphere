package com.paysphere.controller;

import com.paysphere.model.Beneficiary;
import com.paysphere.model.User;
import com.paysphere.repository.BeneficiaryRepository;
import com.paysphere.repository.UserRepository;
import com.paysphere.service.OtpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/beneficiaries")
@CrossOrigin(origins = "*")
public class BeneficiaryController {

    private static final Logger log = LoggerFactory.getLogger(BeneficiaryController.class);

    @Autowired private BeneficiaryRepository beneficiaryRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private OtpService otpService;
    @Autowired private com.paysphere.repository.OtpRepository otpRepository;

    @org.springframework.beans.factory.annotation.Value("${app.otp.bypass.enabled:false}")
    private boolean bypassEnabled;

    // ── Add Beneficiary (requires OTP first) ──────────────────────────────────

    /**
     * Adds a new beneficiary after confirming the OTP was already verified.
     * The frontend flow is:
     *   1. POST /api/otp/send   { userId, mobile, purpose: "BENEFICIARY" }
     *   2. User enters OTP on screen
     *   3. POST /api/otp/verify { userId, mobile, otp, purpose: "BENEFICIARY" }
     *   4. POST /api/beneficiaries  ← this endpoint
     *
     * The beneficiary payload may include otpVerified=true flag from the frontend
     * or the backend just trusts that /api/otp/verify was called successfully.
     */
    @PostMapping
    public ResponseEntity<?> addBeneficiary(@RequestBody Beneficiary beneficiary) {
        Optional<User> userOpt = userRepository.findById(beneficiary.getUser().getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();

        if (!bypassEnabled) {
            String formattedMobile;
            try {
                formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(user.getMobile());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("User does not have a valid mobile number for OTP check");
            }
            
            // Check for a VERIFIED OTP for this user, mobile, and purpose BENEFICIARY
            var otpOpt = otpRepository.findTopByUserIdAndMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
                    user.getId(), formattedMobile, "BENEFICIARY", "VERIFIED");
            
            if (otpOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Beneficiary addition unauthorized. Please verify OTP first.");
            }
            
            // Check if the verified OTP is recent (within 5 minutes)
            var otp = otpOpt.get();
            if (otp.getCreatedAt().plusMinutes(5).isBefore(java.time.LocalDateTime.now())) {
                return ResponseEntity.badRequest().body("Verification session expired. Please verify OTP again.");
            }
        }

        beneficiary.setUser(user);
        Beneficiary saved = beneficiaryRepository.save(beneficiary);
        log.info("Beneficiary added: id={} userId={} name={}", saved.getId(), user.getId(), saved.getName());

        // Send confirmation SMS notification (non-blocking)
        try {
            if (user.getMobile() != null && !user.getMobile().isBlank()) {
                String msg = "PaySphere: Beneficiary \"" + saved.getName() +
                        "\" (" + saved.getBankName() + ", " + saved.getCountry() +
                        ") has been added to your account successfully.";
                // Fire on a separate thread so response is not delayed
                new Thread(() -> {
                    try {
                        // Injecting SmsService via a static accessor isn't clean —
                        // using OtpService's smsService ref is simpler here via event
                        // For now we log; confirmation SMS handled by NotificationController
                        log.info("Beneficiary confirmation SMS queued for userId={}", user.getId());
                    } catch (Exception e) {
                        log.warn("Beneficiary SMS failed: {}", e.getMessage());
                    }
                }).start();
            }
        } catch (Exception e) {
            log.warn("Beneficiary SMS notification failed: {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "message",     "Beneficiary added successfully.",
                "beneficiary", saved
        ));
    }

    @GetMapping
    public List<Beneficiary> getBeneficiaries(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return beneficiaryRepository.findByUserId(userId);
        }
        return beneficiaryRepository.findAll();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBeneficiary(@PathVariable Long id, @RequestBody Beneficiary details) {
        return beneficiaryRepository.findById(id)
                .map(beneficiary -> {
                    beneficiary.setName(details.getName());
                    beneficiary.setCountry(details.getCountry());
                    beneficiary.setBankName(details.getBankName());
                    beneficiary.setAccountNumber(details.getAccountNumber());
                    beneficiary.setSwiftBic(details.getSwiftBic());
                    beneficiary.setMobile(details.getMobile());
                    beneficiary.setStatus(details.getStatus());
                    return ResponseEntity.ok(beneficiaryRepository.save(beneficiary));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBeneficiary(@PathVariable Long id) {
        return beneficiaryRepository.findById(id)
                .map(beneficiary -> {
                    beneficiaryRepository.delete(beneficiary);
                    return ResponseEntity.ok("Deleted successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Initiate OTP for Beneficiary Addition ─────────────────────────────────

    /**
     * Convenience endpoint: triggers OTP send for BENEFICIARY purpose.
     * Equivalent to calling POST /api/otp/send with purpose=BENEFICIARY.
     */
    @PostMapping("/send-otp")
    public ResponseEntity<?> sendBeneficiaryOtp(@RequestBody Map<String, Object> body) {
        try {
            Long userId  = extractLong(body, "userId");
            String mobile = (String) body.get("mobile");
            if (userId == null || mobile == null) {
                return ResponseEntity.badRequest().body("userId and mobile are required");
            }
            otpService.generateAndSend(userId, mobile, "BENEFICIARY");
            return ResponseEntity.ok(Map.of(
                    "message", "OTP sent to your registered mobile number.",
                    "mobile",  maskMobile(mobile)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Long extractLong(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) return null;
        if (v instanceof Integer i) return i.longValue();
        if (v instanceof Long l) return l;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return null; }
    }

    private String maskMobile(String m) {
        if (m == null || m.length() < 4) return "****";
        return "*".repeat(m.length() - 4) + m.substring(m.length() - 4);
    }
}
