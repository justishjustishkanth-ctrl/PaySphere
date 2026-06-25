package com.paysphere.controller;

import com.paysphere.model.User;
import com.paysphere.repository.UserRepository;
import com.paysphere.service.OtpService;
import com.paysphere.service.SmsService;
import com.paysphere.service.SalesforceSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    @Autowired private UserRepository userRepository;
    @Autowired private OtpService otpService;
    @Autowired private SmsService smsService;
    @Autowired private SalesforceSyncService sfSyncService;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Autowired private com.paysphere.util.JwtUtils jwtUtils;
    @Autowired private com.paysphere.repository.AuditLogRepository auditLogRepository;

    private static final ConcurrentHashMap<String, User> pendingRegistrations = new ConcurrentHashMap<>();


    // ── Registration ──────────────────────────────────────────────────────────

    /**
     * Step 1 of registration: validate inputs, save details temporarily,
     * and dispatch verification OTP to the user's exact mobile number.
     */
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already exists");
        }
        if (user.getMobile() == null || user.getMobile().isBlank()) {
            return ResponseEntity.badRequest().body("Mobile number is required for OTP verification");
        }

        // Validate and format mobile number using MobileNumberUtils
        String formattedMobile;
        try {
            formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(user.getMobile());
            user.setMobile(formattedMobile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Please enter a valid Indian mobile number");
        }

        // Hash password before temporary save
        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // Save registration details temporarily in the map (keyed by email)
        pendingRegistrations.put(user.getEmail(), user);
        log.info("Saved pending registration details temporarily for email={}", user.getEmail());

        // Dispatch real OTP SMS (userId=null because MySQL row is not created yet)
        try {
            otpService.generateAndSend(null, formattedMobile, "REGISTER");
            log.info("Registration OTP dispatched to exact mobile={} for email={}", formattedMobile, user.getEmail());
        } catch (Exception e) {
            log.error("Registration OTP send failed for email={}: {}", user.getEmail(), e.getMessage());
            pendingRegistrations.remove(user.getEmail());
            if (e.getMessage() != null && (
                e.getMessage().contains("Destination number is not verified") ||
                e.getMessage().contains("21608") ||
                e.getMessage().contains("not verified in the Twilio Trial Account")
            )) {
                return ResponseEntity.status(400).body(Map.of(
                        "success", false,
                        "code", "TWILIO_NUMBER_NOT_VERIFIED",
                        "error", "This mobile number is not verified in the Twilio Trial Account. Verify it in Twilio Console or upgrade your Twilio account."
                ));
            }
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Registration OTP could not be sent: " + e.getMessage()
            ));
        }

        return ResponseEntity.ok(Map.of(
                "otpRequired",    true,
                "email",          user.getEmail(),
                "mobile",         formattedMobile,
                "message",        "OTP sent to your mobile number. Please verify to complete registration."
        ));
    }

    /**
     * Step 2 of registration: verify the OTP code, then create the account
     * in MySQL and Customer__c record in Salesforce.
     */
    @PostMapping("/register-confirm")
    public ResponseEntity<?> confirmRegistration(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String mobile = body.get("mobile");
        String otp = body.get("otp");

        if (email == null || mobile == null || otp == null) {
            return ResponseEntity.badRequest().body("email, mobile, and otp are required");
        }

        String formattedMobile;
        try {
            formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(mobile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Please enter a valid Indian mobile number");
        }

        // 1. Verify OTP first (throws exception if invalid or expired)
        try {
            otpService.verify(null, formattedMobile, otp, "REGISTER");
            log.info("Registration OTP verified successfully for mobile={}", formattedMobile);
        } catch (Exception e) {
            log.warn("Registration OTP verification failed for mobile={}: {}", formattedMobile, e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }

        // 2. Only after successful OTP verification: Create account in MySQL
        User pendingUser = pendingRegistrations.remove(email);
        if (pendingUser == null) {
            return ResponseEntity.badRequest().body("No pending registration session found for email: " + email);
        }

        // Double check email uniqueness again to avoid race conditions
        if (userRepository.findByEmail(pendingUser.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        User savedUser = userRepository.save(pendingUser);
        log.info("User created in MySQL after successful OTP verification: id={} email={}", savedUser.getId(), savedUser.getEmail());

        // Create customer record in Salesforce
        try {
            sfSyncService.syncUser(savedUser);
            log.info("Salesforce Customer__c synced for user id={} email={}", savedUser.getId(), savedUser.getEmail());
        } catch (Exception e) {
            log.warn("Salesforce Customer__c sync failed (non-fatal): {}", e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Registration completed successfully. You can now log in.",
                "userId",  savedUser.getId()
        ));
    }


    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    /**
     * Step 1 of login: verify credentials, then dispatch OTP.
     * Returns a "pending OTP" response — the frontend must then call
     * POST /api/otp/verify with purpose=LOGIN to complete login.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User loginReq) {
        Optional<User> userOpt = userRepository.findByEmail(loginReq.getEmail());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();

        if (user.isLocked()) {
            return ResponseEntity.badRequest().body("Account is locked");
        }

        if (!passwordEncoder.matches(loginReq.getPassword(), user.getPassword())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= 5) {
                user.setLocked(true);
            }
            userRepository.save(user);
            return ResponseEntity.badRequest().body(
                    "Invalid password. Attempts: " + user.getFailedAttempts());
        }

        // Password correct — reset failed attempts
        user.setFailedAttempts(0);
        userRepository.save(user);

        if (user.getMobile() == null || user.getMobile().isBlank()) {
            // No mobile on file — skip OTP and log in directly (fallback)
            log.warn("User {} has no mobile — skipping login OTP", user.getId());
            String token = jwtUtils.generateToken(user.getEmail(), user.getRole());
            
            if ("ADMIN".equalsIgnoreCase(user.getRole())) {
                try {
                    com.paysphere.model.AuditLog audit = new com.paysphere.model.AuditLog();
                    audit.setAction("Admin Login");
                    audit.setDetails("Admin login success (no 2FA fallback) for account: " + user.getEmail());
                    audit.setUser(user.getEmail());
                    audit.setTimestamp(java.time.LocalDateTime.now());
                    auditLogRepository.save(audit);
                } catch (Exception e) {
                    log.error("Failed to write audit log for admin login fallback: {}", e.getMessage());
                }
            }

            java.util.Map<String, Object> responseBody = new java.util.HashMap<>();
            responseBody.put("id", user.getId());
            responseBody.put("firstName", user.getFirstName());
            responseBody.put("lastName", user.getLastName());
            responseBody.put("email", user.getEmail());
            responseBody.put("mobile", user.getMobile());
            responseBody.put("role", user.getRole());
            responseBody.put("failedAttempts", user.getFailedAttempts());
            responseBody.put("locked", user.isLocked());
            responseBody.put("token", token);
            return ResponseEntity.ok(responseBody);
        }

        // Read stored number and convert to E.164 format if required
        String formattedMobile;
        try {
            formattedMobile = com.paysphere.util.MobileNumberUtils.formatIndianMobileNumber(user.getMobile());
        } catch (Exception e) {
            log.error("Stored mobile number is invalid for userId={}: {}", user.getId(), user.getMobile());
            return ResponseEntity.badRequest().body("Please enter a valid Indian mobile number");
        }

        // Dispatch OTP SMS for login 2FA
        try {
            otpService.generateAndSend(user.getId(), formattedMobile, "LOGIN");
            log.info("Login OTP dispatched → userId={} mobile={}", user.getId(), com.paysphere.util.MobileNumberUtils.mask(formattedMobile));
        } catch (Exception e) {
            log.error("Login OTP send failed for userId={}: {}", user.getId(), e.getMessage());
            if (e.getMessage() != null && (
                e.getMessage().contains("Destination number is not verified") ||
                e.getMessage().contains("21608") ||
                e.getMessage().contains("not verified in the Twilio Trial Account")
            )) {
                return ResponseEntity.status(400).body(Map.of(
                        "success", false,
                        "code", "TWILIO_NUMBER_NOT_VERIFIED",
                        "error", "This mobile number is not verified in the Twilio Trial Account. Verify it in Twilio Console or upgrade your Twilio account."
                ));
            }
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Login credential check passed but OTP could not be sent: " + e.getMessage()
            ));
        }

        // Return pending state (do NOT return the full user object yet)
        return ResponseEntity.ok(Map.of(
                "otpRequired",  true,
                "userId",       user.getId(),
                "mobile",       formattedMobile,
                "maskedMobile", com.paysphere.util.MobileNumberUtils.mask(formattedMobile),
                "role",         user.getRole(),
                "message",      "OTP sent to your registered mobile. Please verify to complete login."
        ));
    }

    /**
     * Step 2 of login: called after OTP is verified by /api/otp/verify.
     * Returns the full user object to populate the auth context.
     */
    @GetMapping("/{id}/profile")
    public ResponseEntity<?> getUserProfile(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/google-login")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body("idToken is required");
        }

        String email = null;
        String uid = null;
        String name = null;
        String picture = null;

        boolean isMock = idToken.startsWith("mock-firebase-");

        try {
            if (isMock) {
                // Mock token format: mock-firebase-[uid]-[email]-[name]-[picture_optional]
                String[] parts = idToken.split("-");
                if (parts.length >= 4) {
                    uid = parts[2];
                    email = parts[3];
                    name = parts.length >= 5 ? parts[4] : "Google User";
                    picture = parts.length >= 6 ? parts[5] : "https://lh3.googleusercontent.com/a/default-user";
                } else {
                    uid = "mock-google-uid-123";
                    email = "google-mock-test@example.com";
                    name = "Google Mock User";
                    picture = "https://lh3.googleusercontent.com/a/default-user";
                }
                log.info("Google Sync (MOCK DEV MODE): Verified token email={}, uid={}", email, uid);
            } else {
                // Live Firebase validation
                if (com.google.firebase.FirebaseApp.getApps().isEmpty()) {
                    return ResponseEntity.status(500).body("Firebase Admin SDK is not initialized.");
                }
                com.google.firebase.auth.FirebaseToken decodedToken = com.google.firebase.auth.FirebaseAuth.getInstance().verifyIdToken(idToken);
                email = decodedToken.getEmail();
                uid = decodedToken.getUid();
                name = decodedToken.getName();
                picture = decodedToken.getPicture();
            }

            if (email == null || uid == null) {
                return ResponseEntity.badRequest().body("Invalid ID Token claims (email or uid is null)");
            }

            // Sync User logic
            Optional<User> userOpt = userRepository.findByFirebaseUid(uid);
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findByEmail(email);
            }

            User user;
            if (userOpt.isEmpty()) {
                // Create user automatically
                user = new User();
                user.setEmail(email);
                user.setFirebaseUid(uid);
                user.setFullName(name);
                user.setProfilePicture(picture);
                user.setProvider("GOOGLE");
                user.setRole("CUSTOMER");
                user.setPassword(""); // empty password
                
                // Parse first name / last name from full name
                if (name != null && !name.isBlank()) {
                    String[] nameParts = name.trim().split("\\s+", 2);
                    user.setFirstName(nameParts[0]);
                    user.setLastName(nameParts.length > 1 ? nameParts[1] : "");
                } else {
                    user.setFirstName("Google");
                    user.setLastName("User");
                }
                
                user.setLocked(false);
                user.setFailedAttempts(0);
                
                log.info("Google Sync: Automatically registering new user: email={}, provider=GOOGLE", email);
            } else {
                user = userOpt.get();
                // Update properties
                user.setFirebaseUid(uid);
                if (name != null && !name.isBlank()) {
                    user.setFullName(name);
                }
                if (picture != null && !picture.isBlank()) {
                    user.setProfilePicture(picture);
                }
                user.setProvider("GOOGLE");
                
                log.info("Google Sync: Logging in existing user: email={}, provider=GOOGLE", email);
            }

            user.setLastLogin(java.time.LocalDateTime.now());
            User saved = userRepository.save(user);

            // Sync User to Salesforce (non-fatal)
            try {
                sfSyncService.syncUser(saved);
            } catch (Exception e) {
                log.warn("Salesforce sync failed during Google sign-in: {}", e.getMessage());
            }

            // Generate PaySphere session JWT
            String appToken = jwtUtils.generateToken(saved.getEmail(), saved.getRole());

            if ("ADMIN".equalsIgnoreCase(saved.getRole())) {
                try {
                    com.paysphere.model.AuditLog audit = new com.paysphere.model.AuditLog();
                    audit.setAction("Admin Login");
                    audit.setDetails("Admin logged in successfully via Google Sign-In: " + saved.getEmail());
                    audit.setUser(saved.getEmail());
                    audit.setTimestamp(java.time.LocalDateTime.now());
                    auditLogRepository.save(audit);
                } catch (Exception e) {
                    log.error("Failed to write audit log for Google admin login: {}", e.getMessage());
                }
            }

            java.util.Map<String, Object> responseBody = new java.util.HashMap<>();
            responseBody.put("id", saved.getId());
            responseBody.put("firstName", saved.getFirstName());
            responseBody.put("lastName", saved.getLastName());
            responseBody.put("email", saved.getEmail());
            responseBody.put("mobile", saved.getMobile());
            responseBody.put("role", saved.getRole());
            responseBody.put("profilePicture", saved.getProfilePicture());
            responseBody.put("provider", saved.getProvider());
            responseBody.put("token", appToken);

            return ResponseEntity.ok(responseBody);

        } catch (Exception e) {
            log.error("Google login token validation failed: " + e.getMessage(), e);
            return ResponseEntity.status(401).body("Authentication failed: " + e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 4) return "****";
        return "*".repeat(mobile.length() - 4) + mobile.substring(mobile.length() - 4);
    }
}
