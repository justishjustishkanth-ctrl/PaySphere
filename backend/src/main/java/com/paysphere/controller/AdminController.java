package com.paysphere.controller;

import com.paysphere.model.*;
import com.paysphere.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @Autowired private UserRepository userRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private TransferRequestRepository transferRequestRepository;
    @Autowired private KYCRepository kycRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private ReceiptRepository receiptRepository;
    @Autowired private FraudLogRepository fraudLogRepository;
    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private NotificationRepository notificationRepository;

    // Simulated Global Settings Store
    private static final Map<String, String> systemSettings = new ConcurrentHashMap<>();

    static {
        systemSettings.put("maintenanceMode", "false");
        systemSettings.put("otpExpiryMinutes", "5");
        systemSettings.put("twilioEnabled", "true");
        systemSettings.put("rateLimitEnabled", "false");
        systemSettings.put("minTransferAmount", "10.0");
        systemSettings.put("maxTransferAmount", "50000.0");
    }

    private String getAdminUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : "admin@paysphere.com";
    }

    private void writeAuditLog(String action, String details) {
        try {
            AuditLog audit = new AuditLog();
            audit.setAction(action);
            audit.setDetails(details);
            audit.setUser(getAdminUsername());
            audit.setTimestamp(LocalDateTime.now());
            auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Failed to write audit log: {}", e.getMessage());
        }
    }

    // ── 1. Dashboard Overview & Analytics ──────────────────────────────────────

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalTxs = transactionRepository.count();

        List<Transaction> allTransactions = transactionRepository.findAll();
        double totalVolume = allTransactions.stream()
                .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        long pendingKyc = kycRepository.findByStatus("PENDING").size();
        long approvedKyc = kycRepository.findByStatus("APPROVED").size();
        long rejectedKyc = kycRepository.findByStatus("REJECTED").size();

        long pendingTransfers = transferRequestRepository.findAll().stream()
                .filter(r -> "PENDING_PAYMENT".equalsIgnoreCase(r.getStatus()) || "PROCESSING".equalsIgnoreCase(r.getStatus()))
                .count();

        long failedTxs = allTransactions.stream()
                .filter(t -> "FAILED".equalsIgnoreCase(t.getStatus()))
                .count();

        long fraudAlerts = fraudLogRepository.count();

        // 12 Months Volume Chart Data (mock combined with current volume data)
        List<Map<String, Object>> volumeHistory = new ArrayList<>();
        String[] months = {"Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        double[] mockVolumes = {15000, 32000, 24000, 41000, 56000, 89000, 62000, 71000, 95000, 110000, 125000, totalVolume > 0 ? totalVolume : 142000};
        
        for (int i = 0; i < 12; i++) {
            Map<String, Object> m = new HashMap<>();
            m.put("month", months[i]);
            m.put("volume", mockVolumes[i]);
            volumeHistory.add(m);
        }

        // Status Distribution
        long successTxs = allTransactions.stream()
                .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .count();
        long pendingTxCount = allTransactions.stream()
                .filter(t -> "PENDING".equalsIgnoreCase(t.getStatus()) || "PROCESSING".equalsIgnoreCase(t.getStatus()))
                .count();

        List<Map<String, Object>> statusDistribution = List.of(
            Map.of("name", "Success", "value", successTxs),
            Map.of("name", "Pending", "value", pendingTxCount),
            Map.of("name", "Failed", "value", failedTxs)
        );

        // KYC Status Distribution
        List<Map<String, Object>> kycDistribution = List.of(
            Map.of("name", "Pending", "value", pendingKyc),
            Map.of("name", "Approved", "value", approvedKyc),
            Map.of("name", "Rejected", "value", rejectedKyc)
        );

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalTransactions", totalTxs);
        stats.put("totalTransferVolume", totalVolume);
        stats.put("pendingKycRequests", pendingKyc);
        stats.put("approvedKycRequests", approvedKyc);
        stats.put("rejectedKycRequests", rejectedKyc);
        stats.put("pendingTransfers", pendingTransfers);
        stats.put("failedTransactions", failedTxs);
        stats.put("fraudAlerts", fraudAlerts);
        stats.put("volumeHistory", volumeHistory);
        stats.put("statusDistribution", statusDistribution);
        stats.put("kycDistribution", kycDistribution);

        return ResponseEntity.ok(stats);
    }

    // ── 2. User Management ─────────────────────────────────────────────────────

    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> editUser(@PathVariable Long id, @RequestBody User updatedUser) {
        return userRepository.findById(id)
                .map(user -> {
                    // Lock protection on the primary admin email
                    if ("justishjustishkanth@gmail.com".equalsIgnoreCase(user.getEmail())) {
                        if (!"ADMIN".equalsIgnoreCase(updatedUser.getRole())) {
                            return ResponseEntity.badRequest().body("Primary admin account role cannot be modified.");
                        }
                    }

                    boolean roleChanged = !user.getRole().equalsIgnoreCase(updatedUser.getRole());
                    String oldRole = user.getRole();
                    
                    user.setFirstName(updatedUser.getFirstName());
                    user.setLastName(updatedUser.getLastName());
                    user.setFullName(updatedUser.getFirstName() + " " + updatedUser.getLastName());
                    user.setEmail(updatedUser.getEmail());
                    user.setMobile(updatedUser.getMobile());
                    user.setRole(updatedUser.getRole());
                    
                    User saved = userRepository.save(user);

                    if (roleChanged) {
                        writeAuditLog("Role Changes", "Changed role of user " + user.getEmail() + " from " + oldRole + " to " + saved.getRole());
                    }

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users/{id}/toggle-lock")
    public ResponseEntity<?> toggleUserLock(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if ("justishjustishkanth@gmail.com".equalsIgnoreCase(user.getEmail())) {
                        return ResponseEntity.badRequest().body("Primary admin account cannot be disabled.");
                    }

                    user.setLocked(!user.isLocked());
                    User saved = userRepository.save(user);

                    String action = saved.isLocked() ? "User Disable" : "User Enable";
                    writeAuditLog(action, (saved.isLocked() ? "Disabled" : "Enabled") + " user account: " + user.getEmail());

                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if ("justishjustishkanth@gmail.com".equalsIgnoreCase(user.getEmail())) {
                        return ResponseEntity.badRequest().body("Primary admin account cannot be deleted.");
                    }

                    userRepository.delete(user);
                    writeAuditLog("User Delete", "Deleted user account: " + user.getEmail());

                    return ResponseEntity.ok().body(Map.of("message", "User deleted successfully"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 3. KYC Management ──────────────────────────────────────────────────────

    @GetMapping("/kyc")
    public List<KYC> getAllKYC() {
        return kycRepository.findAll();
    }

    @PutMapping("/kyc/{id}/approve")
    public ResponseEntity<?> approveKYC(@PathVariable Long id) {
        return kycRepository.findById(id)
                .map(kyc -> {
                    kyc.setStatus("APPROVED");
                    KYC saved = kycRepository.save(kyc);

                    // Create Notification
                    try {
                        Notification notif = new Notification();
                        notif.setUser(kyc.getUser());
                        notif.setMessage("Your KYC request has been successfully verified and APPROVED.");
                        notif.setType("KYC");
                        notif.setRead(false);
                        notif.setTimestamp(LocalDateTime.now());
                        notificationRepository.save(notif);
                    } catch (Exception e) {
                        log.warn("Failed to create customer notification on KYC approval: {}", e.getMessage());
                    }

                    writeAuditLog("KYC Approval", "Approved KYC verification ID: " + id + " for user " + kyc.getUser().getEmail());
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/kyc/{id}/reject")
    public ResponseEntity<?> rejectKYC(@PathVariable Long id) {
        return kycRepository.findById(id)
                .map(kyc -> {
                    kyc.setStatus("REJECTED");
                    KYC saved = kycRepository.save(kyc);

                    // Create Notification
                    try {
                        Notification notif = new Notification();
                        notif.setUser(kyc.getUser());
                        notif.setMessage("Your KYC request has been REJECTED. Please review your documents and submit again.");
                        notif.setType("KYC");
                        notif.setRead(false);
                        notif.setTimestamp(LocalDateTime.now());
                        notificationRepository.save(notif);
                    } catch (Exception e) {
                        log.warn("Failed to create customer notification on KYC rejection: {}", e.getMessage());
                    }

                    writeAuditLog("KYC Rejection", "Rejected KYC verification ID: " + id + " for user " + kyc.getUser().getEmail());
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 4. Transaction Management ──────────────────────────────────────────────

    @GetMapping("/transactions")
    public List<Transaction> getAllTransactions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Double amount,
            @RequestParam(required = false) String userEmail) {

        List<Transaction> txs = transactionRepository.findAll();
        
        if (status != null && !status.isBlank()) {
            txs = txs.stream()
                    .filter(t -> status.equalsIgnoreCase(t.getStatus()))
                    .collect(Collectors.toList());
        }
        if (amount != null) {
            txs = txs.stream()
                    .filter(t -> Objects.equals(t.getAmount(), amount))
                    .collect(Collectors.toList());
        }
        if (userEmail != null && !userEmail.isBlank()) {
            txs = txs.stream()
                    .filter(t -> t.getUser() != null && t.getUser().getEmail().toLowerCase().contains(userEmail.toLowerCase()))
                    .collect(Collectors.toList());
        }
        
        // Sort newest first
        txs.sort((t1, t2) -> t2.getTimestamp().compareTo(t1.getTimestamp()));
        return txs;
    }

    @PostMapping("/transactions/{id}/flag")
    public ResponseEntity<?> flagTransaction(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "Flagged by Admin");
        return transactionRepository.findById(id)
                .map(tx -> {
                    tx.setStatus("FLAGGED");
                    Transaction savedTx = transactionRepository.save(tx);

                    // Log in fraud_logs table
                    try {
                        FraudLog fLog = new FraudLog();
                        fLog.setUser(tx.getUser());
                        fLog.setFlagReason(reason);
                        fLog.setDetails("Transaction ID " + id + " of amount " + tx.getCurrency() + " " + tx.getAmount() + " flagged as suspicious.");
                        fLog.setTimestamp(LocalDateTime.now());
                        fraudLogRepository.save(fLog);
                    } catch (Exception e) {
                        log.error("Failed to write fraud log: {}", e.getMessage());
                    }

                    writeAuditLog("Transaction Flagged", "Flagged transaction ID " + id + " as suspicious. Reason: " + reason);

                    return ResponseEntity.ok(savedTx);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── 5. Payment Management ──────────────────────────────────────────────────

    @GetMapping("/payments")
    public List<Payment> getAllPayments() {
        List<Payment> list = paymentRepository.findAll();
        // Sort newest first if possible (id descending)
        list.sort((p1, p2) -> p2.getId().compareTo(p1.getId()));
        return list;
    }

    // ── 6. Receipts Management ──────────────────────────────────────────────────

    @GetMapping("/receipts")
    public List<Receipt> getAllReceipts() {
        List<Receipt> list = receiptRepository.findAll();
        list.sort((r1, r2) -> r2.getCreatedTimestamp().compareTo(r1.getCreatedTimestamp()));
        return list;
    }

    // ── 7. Fraud Monitoring ────────────────────────────────────────────────────

    @GetMapping("/fraud-logs")
    public List<FraudLog> getAllFraudLogs() {
        List<FraudLog> list = fraudLogRepository.findAll();
        list.sort((f1, f2) -> f2.getTimestamp().compareTo(f1.getTimestamp()));
        return list;
    }

    // ── 8. Audit Logs ──────────────────────────────────────────────────────────

    @GetMapping("/audit-logs")
    public List<AuditLog> getAllAuditLogs() {
        List<AuditLog> list = auditLogRepository.findAll();
        list.sort((a1, a2) -> a2.getTimestamp().compareTo(a1.getTimestamp()));
        return list;
    }

    // ── 9. System Settings ──────────────────────────────────────────────────────

    @GetMapping("/settings")
    public ResponseEntity<?> getSettings() {
        return ResponseEntity.ok(systemSettings);
    }

    @PostMapping("/settings")
    public ResponseEntity<?> updateSettings(@RequestBody Map<String, String> settings) {
        systemSettings.putAll(settings);
        writeAuditLog("System Settings Update", "Updated system configuration attributes: " + settings.keySet());
        return ResponseEntity.ok(systemSettings);
    }
}
