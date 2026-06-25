package com.paysphere.controller;

import com.paysphere.model.OtpAuditLog;
import com.paysphere.repository.OtpAuditLogRepository;
import com.paysphere.service.OtpService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller exposing OTP operations.
 *
 * Endpoints:
 *   POST /api/otp/send    — generate OTP and dispatch SMS
 *   POST /api/otp/verify  — verify OTP entered by user
 *   POST /api/otp/resend  — resend a fresh OTP
 *   GET  /api/otp/logs    — get OTP audit logs (admin)
 *
 * Request body schema for send/verify/resend:
 * {
 *   "userId":  1,              // optional for REGISTER flow
 *   "mobile":  "+919876543210",
 *   "otp":     "456789",       // only for verify
 *   "purpose": "LOGIN"         // REGISTER | LOGIN | TRANSFER | BENEFICIARY | PASSWORD_RESET
 * }
 */
@RestController
@RequestMapping("/api/otp")
@CrossOrigin(origins = "*")
public class OtpController {

    private static final Logger log = LoggerFactory.getLogger(OtpController.class);

    @Autowired private OtpService otpService;
    @Autowired private OtpAuditLogRepository auditLogRepository;
    @Autowired private com.paysphere.repository.UserRepository userRepository;
    @Autowired private com.paysphere.util.JwtUtils jwtUtils;
    @Autowired private com.paysphere.repository.AuditLogRepository adminAuditLogRepository;

    // ── Send OTP ──────────────────────────────────────────────────────────────

    @PostMapping("/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, Object> body) {
        try {
            Long userId = extractUserId(body);
            String mobile  = requireString(body, "mobile");
            String purpose = requireString(body, "purpose").toUpperCase();

            String formattedMobile;
            try {
                formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Please enter a valid Indian mobile number"
                ));
            }

            otpService.generateAndSend(userId, formattedMobile, purpose);

            log.info("OTP send API → userId={} mobile={} purpose={}", userId, com.paysphere.util.MobileNumberUtils.mask(formattedMobile), purpose);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "OTP sent to your registered mobile number.",
                    "mobile",  com.paysphere.util.MobileNumberUtils.mask(formattedMobile)
            ));
        } catch (RuntimeException e) {
            log.warn("OTP send failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error",   e.getMessage()
            ));
        }
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, Object> body) {
        try {
            Long userId   = extractUserId(body);
            String mobile  = requireString(body, "mobile");
            String otp     = requireString(body, "otp");
            String purpose = requireString(body, "purpose").toUpperCase();

            String formattedMobile;
            try {
                formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Please enter a valid Indian mobile number"
                ));
            }

            otpService.verify(userId, formattedMobile, otp, purpose);

            log.info("OTP verify API → success userId={} purpose={}", userId, purpose);

            java.util.Map<String, Object> responseData = new java.util.HashMap<>();
            responseData.put("success", true);
            responseData.put("message", "OTP verified successfully.");
            responseData.put("purpose", purpose);

            if ("LOGIN".equalsIgnoreCase(purpose) && userId != null) {
                userRepository.findById(userId).ifPresent(user -> {
                    String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
                    
                    if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                        try {
                            com.paysphere.model.AuditLog audit = new com.paysphere.model.AuditLog();
                            audit.setAction("Admin Login");
                            audit.setDetails("Admin login success (via 2FA OTP verification) for account: " + user.getEmail());
                            audit.setUser(user.getEmail());
                            audit.setTimestamp(java.time.LocalDateTime.now());
                            adminAuditLogRepository.save(audit);
                        } catch (Exception e) {
                            log.error("Failed to write audit log for admin login OTP verify: {}", e.getMessage());
                        }
                    }

                    java.util.Map<String, Object> userMap = new java.util.HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("firstName", user.getFirstName());
                    userMap.put("lastName", user.getLastName());
                    userMap.put("email", user.getEmail());
                    userMap.put("mobile", user.getMobile());
                    userMap.put("role", user.getRole());
                    userMap.put("failedAttempts", user.getFailedAttempts());
                    userMap.put("locked", user.isLocked());
                    userMap.put("token", token);
                    
                    responseData.put("user", userMap);
                });
            }

            return ResponseEntity.ok(responseData);
        } catch (RuntimeException e) {
            log.warn("OTP verify failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error",   e.getMessage()
            ));
        }
    }

    // ── Resend OTP ────────────────────────────────────────────────────────────

    @PostMapping("/resend")
    public ResponseEntity<?> resendOtp(@RequestBody Map<String, Object> body) {
        try {
            Long userId   = extractUserId(body);
            String mobile  = requireString(body, "mobile");
            String purpose = requireString(body, "purpose").toUpperCase();

            String formattedMobile;
            try {
                formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "error", "Please enter a valid Indian mobile number"
                ));
            }

            otpService.resend(userId, formattedMobile, purpose);

            log.info("OTP resend API → userId={} mobile={} purpose={}", userId, com.paysphere.util.MobileNumberUtils.mask(formattedMobile), purpose);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "A new OTP has been sent to your mobile number.",
                    "mobile",  com.paysphere.util.MobileNumberUtils.mask(formattedMobile)
            ));
        } catch (RuntimeException e) {
            log.warn("OTP resend failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error",   e.getMessage()
            ));
        }
    }

    // ── Audit Logs (Admin) ────────────────────────────────────────────────────

    /**
     * Returns OTP audit logs.
     *
     * Query params:
     *   userId — filter by user
     *   action — filter by action (SENT/VERIFIED/FAILED/EXPIRED/LOCKED/RESENT)
     */
    @GetMapping("/logs")
    public ResponseEntity<?> getOtpLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String action) {

        List<OtpAuditLog> logs;
        if (userId != null) {
            logs = auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
        } else if (action != null && !action.isBlank()) {
            logs = auditLogRepository.findByActionOrderByTimestampDesc(action.toUpperCase());
        } else {
            logs = auditLogRepository.findAllByOrderByTimestampDesc();
        }
        return ResponseEntity.ok(logs);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Long extractUserId(Map<String, Object> body) {
        Object raw = body.get("userId");
        if (raw == null) return null;
        Long val = null;
        if (raw instanceof Integer i) val = i.longValue();
        else if (raw instanceof Long l)    val = l;
        else {
            try { val = Long.parseLong(raw.toString()); } catch (Exception e) { return null; }
        }
        return (val == null || val <= 0) ? null : val;
    }

    private String requireString(Map<String, Object> body, String key) {
        Object val = body.get(key);
        if (val == null || val.toString().isBlank()) {
            throw new RuntimeException("Missing required field: " + key);
        }
        return val.toString().trim();
    }

    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 4) return "****";
        return "*".repeat(mobile.length() - 4) + mobile.substring(mobile.length() - 4);
    }
}
