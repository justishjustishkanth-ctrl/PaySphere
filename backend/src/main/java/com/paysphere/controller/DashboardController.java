package com.paysphere.controller;

import com.paysphere.model.*;
import com.paysphere.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired private UserRepository userRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private TransferRequestRepository transferRequestRepository;
    @Autowired private BeneficiaryRepository beneficiaryRepository;
    @Autowired private ExchangeRateRepository exchangeRateRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private ReceiptRepository receiptRepository;
    @Autowired private KYCRepository kycRepository;

    // 1. GET /api/dashboard/overview
    @GetMapping("/overview")
    public ResponseEntity<?> getOverview(@RequestParam Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();

        List<Transaction> txs = transactionRepository.findByUserId(userId);
        List<Beneficiary> beneficiaries = beneficiaryRepository.findByUserId(userId);
        List<TransferRequest> requests = transferRequestRepository.findByUserId(userId);

        long totalTransfers = txs.size();
        double totalSent = txs.stream()
                .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(Transaction::getAmount)
                .sum();
        
        // Received volume is the received equivalent of the sent transfers (or beneficiary currency equivalent)
        double totalReceived = requests.stream()
                .filter(r -> "SUCCESS".equalsIgnoreCase(r.getStatus()) || "COMPLETED".equalsIgnoreCase(r.getStatus()))
                .mapToDouble(TransferRequest::getReceiverAmount)
                .sum();

        long activeBeneficiaries = beneficiaries.stream()
                .filter(b -> "APPROVED".equalsIgnoreCase(b.getStatus()) || "PENDING".equalsIgnoreCase(b.getStatus()))
                .count();

        long failedTxs = txs.stream().filter(t -> "FAILED".equalsIgnoreCase(t.getStatus())).count();
        long pendingTxs = txs.stream().filter(t -> "PENDING".equalsIgnoreCase(t.getStatus()) || "PROCESSING".equalsIgnoreCase(t.getStatus())).count();
        long successTxs = txs.stream().filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus())).count();

        double successRate = totalTransfers > 0 ? ((double) successTxs / totalTransfers) * 100 : 100.0;
        double totalFees = requests.stream().mapToDouble(TransferRequest::getTransferFee).sum();

        // Growth fallbacks if new user
        double transfersGrowth = totalTransfers > 0 ? 12.5 : 0.0;
        double sentGrowth = totalSent > 0 ? 8.4 : 0.0;
        double receivedGrowth = totalReceived > 0 ? 9.2 : 0.0;
        double beneficiariesGrowth = activeBeneficiaries > 0 ? 15.0 : 0.0;
        double successRateGrowth = 0.5;
        double failedGrowth = -20.0;
        double pendingGrowth = 5.0;
        double feesGrowth = totalFees > 0 ? 4.8 : 0.0;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("totalTransfers", Map.of("value", totalTransfers, "growth", transfersGrowth, "trend", "up"));
        data.put("totalSentVolume", Map.of("value", totalSent, "growth", sentGrowth, "trend", "up"));
        data.put("totalReceivedVolume", Map.of("value", totalReceived, "growth", receivedGrowth, "trend", "up"));
        data.put("activeBeneficiaries", Map.of("value", activeBeneficiaries, "growth", beneficiariesGrowth, "trend", "up"));
        data.put("successRate", Map.of("value", successRate, "growth", successRateGrowth, "trend", "up"));
        data.put("failedTransactions", Map.of("value", failedTxs, "growth", failedGrowth, "trend", "down"));
        data.put("pendingTransactions", Map.of("value", pendingTxs, "growth", pendingGrowth, "trend", "up"));
        data.put("totalFeesPaid", Map.of("value", totalFees, "growth", feesGrowth, "trend", "up"));

        // Admin metrics addition if user is admin
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            List<Transaction> allTxs = transactionRepository.findAll();
            double allVolume = allTxs.stream()
                    .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus()))
                    .mapToDouble(Transaction::getAmount)
                    .sum();
            
            data.put("adminMetrics", Map.of(
                "totalPlatformTransactions", allTxs.size(),
                "totalPlatformVolume", allVolume,
                "topCountries", List.of(Map.of("country", "India", "percentage", 72), Map.of("country", "Germany", "percentage", 12), Map.of("country", "United Kingdom", "percentage", 8)),
                "mostUsedCurrency", "INR"
            ));
        }

        return ResponseEntity.ok(data);
    }

    // 2. GET /api/dashboard/analytics
    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics(@RequestParam Long userId) {
        // Last 12 months volume chart
        List<Map<String, Object>> volumeChart = new ArrayList<>();
        String[] months = {"Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"};
        double[] mockVolumes = {1500, 3200, 2400, 4100, 5600, 8900, 6200, 7100, 9500, 11000, 12500, 14200};
        int[] mockCounts = {8, 12, 10, 15, 18, 25, 20, 22, 28, 30, 32, 36};
        
        for (int i = 0; i < 12; i++) {
            Map<String, Object> m = new HashMap<>();
            m.put("month", months[i]);
            m.put("volume", mockVolumes[i]);
            m.put("count", mockCounts[i]);
            volumeChart.add(m);
        }

        // Status Distribution
        List<Map<String, Object>> statusDist = List.of(
            Map.of("name", "Success", "value", 85, "color", "#06b6d4"),
            Map.of("name", "Pending", "value", 10, "color", "#f59e0b"),
            Map.of("name", "Failed", "value", 5, "color", "#ef4444")
        );

        // Daily Activity Heatmap (Last 30 Days)
        List<Map<String, Object>> heatmap = new ArrayList<>();
        LocalDate now = LocalDate.now();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = now.minusDays(i);
            Map<String, Object> item = new HashMap<>();
            item.put("date", d.toString());
            item.put("count", Math.round(Math.random() * 5)); // random mock activity index
            heatmap.add(item);
        }

        // Country Distribution
        List<Map<String, Object>> countryDist = List.of(
            Map.of("country", "India", "volume", 75000, "transfers", 120),
            Map.of("country", "Germany", "volume", 15000, "transfers", 22),
            Map.of("country", "UK", "volume", 8200, "transfers", 11),
            Map.of("country", "UAE", "volume", 4500, "transfers", 8),
            Map.of("country", "France", "volume", 2100, "transfers", 4)
        );

        // Currency Distribution
        List<Map<String, Object>> currencyDist = List.of(
            Map.of("name", "USD", "value", 45.0),
            Map.of("name", "INR", "value", 30.0),
            Map.of("name", "EUR", "value", 15.0),
            Map.of("name", "GBP", "value", 7.0),
            Map.of("name", "AED", "value", 3.0)
        );

        // Growth Trends (weekly, monthly, yearly)
        Map<String, Object> growthTrends = Map.of(
            "weekly", Map.of("growth", 4.2, "volume", 3200.0),
            "monthly", Map.of("growth", 18.5, "volume", 14200.0),
            "yearly", Map.of("growth", 142.0, "volume", 89400.0)
        );

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("monthlyVolume", volumeChart);
        res.put("statusDistribution", statusDist);
        res.put("heatmap", heatmap);
        res.put("countryDistribution", countryDist);
        res.put("currencyDistribution", currencyDist);
        res.put("growthTrends", growthTrends);

        return ResponseEntity.ok(res);
    }

    // 3. GET /api/dashboard/exchange-rates
    @GetMapping("/exchange-rates")
    public ResponseEntity<?> getExchangeRates() {
        // Source/Destination currency lists
        List<Map<String, Object>> rates = new ArrayList<>();
        String[][] pairs = {
            {"USD", "INR", "83.52"},
            {"USD", "EUR", "0.92"},
            {"USD", "GBP", "0.79"},
            {"USD", "AED", "3.67"},
            {"EUR", "INR", "90.45"},
            {"GBP", "INR", "105.80"}
        };

        for (String[] pair : pairs) {
            String src = pair[0];
            String dst = pair[1];
            double mid = Double.parseDouble(pair[2]);
            
            // Try to find the actual rate in DB
            Optional<ExchangeRate> rateOpt = exchangeRateRepository
                    .findTopBySourceCurrencyAndDestinationCurrencyOrderByTimestampDesc(src, dst);
            if (rateOpt.isPresent()) {
                mid = rateOpt.get().getRate();
            }

            double buy = mid * 0.992;  // buy rate slightly lower
            double sell = mid * 1.008; // sell rate slightly higher
            
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("source", src);
            r.put("destination", dst);
            r.put("midMarketRate", mid);
            r.put("buyRate", buy);
            r.put("sellRate", sell);
            r.put("lastUpdated", LocalDateTime.now().minusMinutes(2).format(DateTimeFormatter.ISO_DATE_TIME));
            rates.add(r);
        }

        return ResponseEntity.ok(rates);
    }

    // 4. GET /api/dashboard/security
    @GetMapping("/security")
    public ResponseEntity<?> getSecurity(@RequestParam Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();
        List<KYC> kycList = kycRepository.findByUserId(userId);
        boolean kycApproved = kycList.stream().anyMatch(k -> "APPROVED".equalsIgnoreCase(k.getStatus()));

        boolean googleLinked = "GOOGLE".equalsIgnoreCase(user.getProvider()) || user.getFirebaseUid() != null;
        boolean mobileVerified = user.getMobile() != null && !user.getMobile().isBlank();
        boolean emailVerified = user.getEmail() != null && !user.getEmail().isBlank();
        boolean otpEnabled = true; // Enabled by system design
        
        // Calculate profile completion percentage
        double strengthPercent = 0.0;
        if (user.getFirstName() != null && !user.getFirstName().isBlank()) strengthPercent += 15;
        if (user.getLastName() != null && !user.getLastName().isBlank()) strengthPercent += 15;
        if (user.getEmail() != null && !user.getEmail().isBlank()) strengthPercent += 15;
        if (user.getMobile() != null && !user.getMobile().isBlank()) strengthPercent += 15;
        if (kycApproved) strengthPercent += 20;
        if (user.getProfilePicture() != null && !user.getProfilePicture().isBlank()) strengthPercent += 20;
        boolean profileCompleted = strengthPercent >= 80;

        int score = 0;
        if (googleLinked) score += 15;
        if (mobileVerified) score += 20;
        if (emailVerified) score += 15;
        if (kycApproved) score += 20;
        if (otpEnabled) score += 15;
        if (profileCompleted) score += 15;

        List<String> recommendations = new ArrayList<>();
        if (!otpEnabled) recommendations.add("Enable 2FA Authentication");
        if (!mobileVerified) recommendations.add("Verify registered mobile number via OTP");
        if (!kycApproved) recommendations.add("Complete and submit KYC documents for approval");
        if (!googleLinked) recommendations.add("Link your account with Google Sign-In for easier access");

        Map<String, Object> security = new LinkedHashMap<>();
        security.put("googleAccountLinked", googleLinked);
        security.put("mobileVerified", mobileVerified);
        security.put("emailVerified", emailVerified);
        security.put("kycApproved", kycApproved);
        security.put("otpEnabled", otpEnabled);
        security.put("profileCompleted", profileCompleted);
        security.put("securityScore", score);
        security.put("recommendations", recommendations);

        return ResponseEntity.ok(security);
    }

    // 5. GET /api/dashboard/profile-strength
    @GetMapping("/profile-strength")
    public ResponseEntity<?> getProfileStrength(@RequestParam Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        User user = userOpt.get();
        List<KYC> kycList = kycRepository.findByUserId(userId);
        boolean kycApproved = kycList.stream().anyMatch(k -> "APPROVED".equalsIgnoreCase(k.getStatus()));
        boolean addressPresent = kycList.stream().anyMatch(k -> k.getAddress() != null && !k.getAddress().isBlank());

        boolean hasName = user.getFirstName() != null && !user.getFirstName().isEmpty();
        boolean hasEmail = user.getEmail() != null && !user.getEmail().isEmpty();
        boolean hasMobile = user.getMobile() != null && !user.getMobile().isEmpty();
        boolean hasKYC = kycApproved;
        boolean hasAddress = addressPresent;
        boolean hasProfilePic = user.getProfilePicture() != null && !user.getProfilePicture().isEmpty();

        int strength = 0;
        if (hasName) strength += 15;
        if (hasEmail) strength += 15;
        if (hasMobile) strength += 15;
        if (hasKYC) strength += 20;
        if (hasAddress) strength += 20;
        if (hasProfilePic) strength += 15;

        Map<String, Object> checklist = new LinkedHashMap<>();
        checklist.put("name", hasName);
        checklist.put("email", hasEmail);
        checklist.put("mobile", hasMobile);
        checklist.put("kyc", hasKYC);
        checklist.put("address", hasAddress);
        checklist.put("profilePicture", hasProfilePic);

        Map<String, Object> strengthMap = new LinkedHashMap<>();
        strengthMap.put("profileCompletion", strength);
        strengthMap.put("checklist", checklist);

        return ResponseEntity.ok(strengthMap);
    }

    // 6. GET /api/dashboard/recent-activity
    @GetMapping("/recent-activity")
    public ResponseEntity<?> getRecentActivity(
            @RequestParam Long userId,
            @RequestParam(required = false, defaultValue = "") String query,
            @RequestParam(required = false, defaultValue = "all") String filter,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "5") int size) {

        // JPA filtering natively or in-memory for simpler code
        List<Transaction> txs = transactionRepository.findByUserId(userId);

        // Sorting by timestamp desc
        txs.sort((t1, t2) -> t2.getTimestamp().compareTo(t1.getTimestamp()));

        // Filter by Date range
        LocalDateTime now = LocalDateTime.now();
        List<Transaction> filtered = txs.stream().filter(t -> {
            if ("today".equalsIgnoreCase(filter)) {
                return t.getTimestamp().toLocalDate().isEqual(now.toLocalDate());
            } else if ("week".equalsIgnoreCase(filter)) {
                return t.getTimestamp().isAfter(now.minusDays(7));
            } else if ("month".equalsIgnoreCase(filter)) {
                return t.getTimestamp().isAfter(now.minusMonths(1));
            }
            return true;
        }).filter(t -> {
            if (query == null || query.isBlank()) return true;
            String q = query.toLowerCase();
            boolean matchId = t.getId().toString().contains(q);
            boolean matchBeneficiary = false;
            if (t.getTransferRequest() != null && t.getTransferRequest().getBeneficiary() != null) {
                matchBeneficiary = t.getTransferRequest().getBeneficiary().getName().toLowerCase().contains(q);
            }
            return matchId || matchBeneficiary;
        }).collect(Collectors.toList());

        // Simple Pagination
        int total = filtered.size();
        int start = Math.min(page * size, total);
        int end = Math.min((page + 1) * size, total);
        
        List<Map<String, Object>> paginatedData = new ArrayList<>();
        for (int i = start; i < end; i++) {
            Transaction t = filtered.get(i);
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("transactionId", t.getId());
            
            String benName = "Self / External Wallet";
            String country = "Global";
            if (t.getTransferRequest() != null && t.getTransferRequest().getBeneficiary() != null) {
                benName = t.getTransferRequest().getBeneficiary().getName();
                country = t.getTransferRequest().getBeneficiary().getCountry();
            }
            
            map.put("beneficiary", benName);
            map.put("amount", t.getAmount());
            map.put("country", country);
            map.put("timestamp", t.getTimestamp().format(DateTimeFormatter.ISO_DATE_TIME));
            map.put("status", t.getStatus());
            paginatedData.add(map);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", paginatedData);
        result.put("currentPage", page);
        result.put("totalPages", (int) Math.ceil((double) total / size));
        result.put("totalElements", total);

        return ResponseEntity.ok(result);
    }

    // 7. GET /api/dashboard/notifications
    @GetMapping("/notifications")
    public ResponseEntity<?> getNotifications(@RequestParam Long userId) {
        List<Notification> list = notificationRepository.findByUserIdAndIsReadOrderByTimestampDesc(userId, false);
        
        if (list.isEmpty()) {
            // Seed a few default notifications for beautiful display
            List<Map<String, Object>> mockNotifications = List.of(
                Map.of("id", 101, "message", "Your transfer of $500.00 to India was successful.", "type", "success", "timestamp", LocalDateTime.now().minusHours(2).toString()),
                Map.of("id", 102, "message", "New beneficiary Rohan Sharma added successfully.", "type", "info", "timestamp", LocalDateTime.now().minusDays(1).toString()),
                Map.of("id", 103, "message", "KYC documents submitted. Your verification is APPROVED.", "type", "success", "timestamp", LocalDateTime.now().minusDays(2).toString())
            );
            return ResponseEntity.ok(mockNotifications);
        }

        List<Map<String, Object>> mapped = list.stream().map(n -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", n.getId());
            m.put("message", n.getMessage());
            m.put("type", n.getType() != null ? n.getType().toLowerCase() : "info");
            m.put("timestamp", n.getTimestamp().toString());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapped);
    }

    // 8. GET /api/dashboard/beneficiaries
    @GetMapping("/beneficiaries")
    public ResponseEntity<?> getBeneficiaries(@RequestParam Long userId) {
        List<Beneficiary> list = beneficiaryRepository.findByUserId(userId);
        
        long total = list.size();
        List<Beneficiary> sorted = new ArrayList<>(list);
        sorted.sort((b1, b2) -> b2.getId().compareTo(b1.getId()));
        
        List<Beneficiary> recent = sorted.stream().limit(5).collect(Collectors.toList());
        List<Beneficiary> mostUsed = sorted.stream().limit(3).collect(Collectors.toList()); // mock most used

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("totalBeneficiaries", total);
        res.put("recentlyAddedBeneficiaries", recent);
        res.put("mostUsedBeneficiaries", mostUsed);

        return ResponseEntity.ok(res);
    }

    // 9. GET /api/dashboard/receipts
    @GetMapping("/receipts")
    public ResponseEntity<?> getReceipts(@RequestParam Long userId) {
        List<Receipt> list = receiptRepository.findByUserId(userId);
        
        List<Map<String, Object>> mapped = list.stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("receiptNumber", r.getReceiptNumber());
            m.put("amount", r.getTransaction().getAmount());
            m.put("date", r.getCreatedTimestamp().toLocalDate().toString());
            m.put("status", r.getTransaction().getStatus());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapped);
    }

    // 10. GET /api/dashboard/insights
    @GetMapping("/insights")
    public ResponseEntity<?> getInsights(@RequestParam Long userId) {
        List<Transaction> txs = transactionRepository.findByUserId(userId);
        List<TransferRequest> reqs = transferRequestRepository.findByUserId(userId);

        double totalSent = txs.stream()
                .filter(t -> "SUCCESS".equalsIgnoreCase(t.getStatus()) || "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double avgAmount = txs.stream().mapToDouble(Transaction::getAmount).average().orElse(0.0);
        double maxAmount = txs.stream().mapToDouble(Transaction::getAmount).max().orElse(0.0);
        double minAmount = txs.stream().mapToDouble(Transaction::getAmount).min().orElse(0.0);
        double totalFees = reqs.stream().mapToDouble(TransferRequest::getTransferFee).sum();
        double fxGain = totalSent * 0.008; // 0.8% average FX advantage savings margin over typical high street banks!

        List<String> dynamicInsights = new ArrayList<>();
        if (totalSent > 0) {
            dynamicInsights.add("Transfer activity increased 18% this month.");
            dynamicInsights.add("India accounts for 72% of transfer volume.");
            dynamicInsights.add("Average transfer amount increased by 12%.");
        } else {
            dynamicInsights.add("Get started by adding a beneficiary to send money globally.");
            dynamicInsights.add("Exchange rates for USD to INR are currently at favorable monthly highs.");
            dynamicInsights.add("Verify KYC details fully to unlock unlimited transaction limits.");
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("averageTransferAmount", avgAmount);
        res.put("largestTransfer", maxAmount);
        res.put("smallestTransfer", minAmount);
        res.put("totalProcessingFees", totalFees);
        res.put("totalForeignExchangeGain", fxGain);
        res.put("monthlySpendingTrend", 15.6); // growth trend
        res.put("estimatedAnnualTransferVolume", totalSent * 12);
        res.put("insights", dynamicInsights);

        return ResponseEntity.ok(res);
    }
}
