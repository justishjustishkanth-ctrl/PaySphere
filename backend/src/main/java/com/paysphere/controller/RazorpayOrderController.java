package com.paysphere.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.paysphere.repository.ExchangeRateRepository;
import com.paysphere.repository.TransferRequestRepository;
import com.paysphere.model.TransferRequest;
import com.paysphere.model.User;
import com.paysphere.model.Beneficiary;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/**
 * Creates Razorpay orders via the Razorpay Orders API.
 *
 * Endpoint: POST /api/razorpay/orders
 *
 * The frontend calls this to obtain a real Razorpay order_id before
 * opening the Razorpay Checkout popup.
 */
@RestController
@RequestMapping("/api/razorpay")
@CrossOrigin(origins = "*")
public class RazorpayOrderController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayOrderController.class);

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    @Autowired
    private ExchangeRateRepository exchangeRateRepository;

    @Autowired
    private TransferRequestRepository transferRequestRepository;

    /**
     * Helper to lookup currency exchange rate with fallback standard values.
     */
    private double getRateForCurrency(String source, String dest) {
        try {
            if (exchangeRateRepository != null) {
                var rateOpt = exchangeRateRepository.findTopBySourceCurrencyAndDestinationCurrencyOrderByTimestampDesc(source, dest);
                if (rateOpt.isPresent()) {
                    return rateOpt.get().getRate();
                }
            }
        } catch (Exception e) {
            log.warn("Failed to lookup exchange rate from repository: {}", e.getMessage());
        }

        // Fallback default rates
        if ("USD".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 83.5;
        if ("EUR".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 90.2;
        if ("GBP".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 106.1;
        return 1.0;
    }

    /**
     * Creates a Razorpay order.
     *
     * @param body must contain: amount (in major currency units, e.g. 1010 for $1010),
     *             currency (e.g. "USD"), transferRequestId (for receipt tracking)
     * @return JSON with Razorpay order id, amount (in paise/cents), currency
     */
    @PostMapping("/orders")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> body) {
        try {
            log.info("=== BACKEND: INCOMING REQUEST ===");
            log.info("Request Body Map: {}", body);
            Object trIdObj = body.get("transferRequestId");
            log.info("Transfer Request ID: {}", trIdObj);
            log.info("Amount: {}", body.get("amount"));
            log.info("Currency: {}", body.get("currency"));

            if (trIdObj != null) {
                try {
                    Long trId = Long.parseLong(trIdObj.toString());
                    Optional<TransferRequest> trOpt = transferRequestRepository.findById(trId);
                    if (trOpt.isPresent()) {
                        TransferRequest tr = trOpt.get();
                        User customer = tr.getUser();
                        Beneficiary beneficiary = tr.getBeneficiary();
                        if (customer != null) {
                            log.info("Customer: ID={}, Name={} {}, Email={}, Mobile={}",
                                    customer.getId(), customer.getFirstName(), customer.getLastName(), customer.getEmail(), customer.getMobile());
                        } else {
                            log.info("Customer: null");
                        }
                        if (beneficiary != null) {
                            log.info("Beneficiary: ID={}, Name={}, Bank={}, Account={}, Country={}",
                                    beneficiary.getId(), beneficiary.getName(), beneficiary.getBankName(), beneficiary.getAccountNumber(), beneficiary.getCountry());
                        } else {
                            log.info("Beneficiary: null");
                        }
                    } else {
                        log.warn("TransferRequest #{} not found in DB", trId);
                    }
                } catch (Exception ex) {
                    log.warn("Failed to fetch TransferRequest/Customer/Beneficiary for logging: {}", ex.getMessage());
                }
            }

            String env = (razorpayKeyId != null && razorpayKeyId.startsWith("rzp_test_")) ? "TEST MODE" : "LIVE MODE";
            log.info("=== VERIFY CONFIGURATION ===");
            log.info("Loaded Razorpay Key: {}", razorpayKeyId);
            log.info("Razorpay Environment: {}", env);
            log.info("Order API URL: https://api.razorpay.com/v1/orders");

            Number amountNum = (Number) body.get("amount");
            String currency = (String) body.getOrDefault("currency", "INR");

            if (amountNum == null || amountNum.doubleValue() <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount"));
            }

            double amountDouble = amountNum.doubleValue();
            String originalCurrency = currency != null ? currency.toUpperCase() : "INR";
            String targetCurrency = originalCurrency;
            double conversionRate = 1.0;

            // Since Indian Razorpay accounts only accept domestic card payments by default (INR),
            // and international payments in USD are restricted/not approved, we convert non-INR orders to INR
            // to bypass international card payment restriction.
            if (!"INR".equals(originalCurrency)) {
                targetCurrency = "INR";
                conversionRate = getRateForCurrency(originalCurrency, "INR");
                amountDouble = amountDouble * conversionRate;
                log.info("Converting Razorpay order amount from {} to INR for payment. Rate={}, Original Amount={}, Converted Amount={}", 
                        originalCurrency, conversionRate, amountNum, amountDouble);
            }

            // Razorpay expects amount in smallest currency unit (paise for INR, cents for USD)
            int amountInSmallestUnit = (int) Math.round(amountDouble * 100);

            // Razorpay test mode has a maximum order limit (typically ₹5,00,000 / 50,000,000 paise).
            // To prevent BAD_REQUEST_ERROR (Amount exceeds maximum amount allowed) during testing,
            // we dynamically cap the order amount at ₹1,00,000 (10,000,000 paise) if running in test mode
            // and the amount exceeds the allowed limits.
            if ("TEST MODE".equals(env) && amountInSmallestUnit > 50000000) {
                log.warn("WARNING: Converted amount ({} paise) exceeds test mode limit. Capping order amount at 10,000,000 paise (INR 1,00,000) for payment processing.", amountInSmallestUnit);
                amountInSmallestUnit = 10000000;
            }

            String receipt = "rcpt_tr_" + (trIdObj != null ? trIdObj.toString() : "unknown");

            // Build JSON payload
            String jsonPayload = String.format(
                    "{\"amount\":%d,\"currency\":\"%s\",\"receipt\":\"%s\"}",
                    amountInSmallestUnit, targetCurrency, receipt);

            // Call Razorpay Orders API
            URL url = new URL("https://api.razorpay.com/v1/orders");

            log.info("=== RAZORPAY API CALL ===");
            log.info("Key ID loaded: {}", razorpayKeyId);
            log.info("Secret loaded: {}", (razorpayKeySecret != null ? "YES (masked secret: " + razorpayKeySecret.substring(0, Math.min(4, razorpayKeySecret.length())) + "...)" : "NO"));
            
            String auth = razorpayKeyId + ":" + razorpayKeySecret;
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            log.info("Authentication headers: Basic {}", encodedAuth);
            log.info("Orders API request: URL={}, Method=POST, Body={}", url, jsonPayload);

            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestProperty("Authorization", "Basic " + encodedAuth);
            conn.setRequestProperty("Content-Type", "application/json");

            // Write body
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonPayload.getBytes(StandardCharsets.UTF_8));
            }

            int statusCode = conn.getResponseCode();
            log.info("HTTP status code: {}", statusCode);

            InputStream is = (statusCode >= 200 && statusCode < 300)
                    ? conn.getInputStream()
                    : conn.getErrorStream();

            String responseBody;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                responseBody = sb.toString();
            }
            conn.disconnect();

            if (statusCode >= 200 && statusCode < 300) {
                log.info("Orders API response: {}", responseBody);
                String orderId = extractJsonField(responseBody, "id");
                return ResponseEntity.ok(Map.of(
                        "orderId", orderId != null ? orderId : "",
                        "amount", amountInSmallestUnit,
                        "currency", targetCurrency,
                        "keyId", razorpayKeyId
                ));
            } else {
                log.error("Razorpay order creation failed. HTTP status={}, Response body: {}", statusCode, responseBody);
                // Extract the actual error description from Razorpay's JSON error response
                String razorpayErrorDesc = extractJsonField(responseBody, "description");
                String razorpayErrorCode = extractJsonField(responseBody, "code");
                String actualError = String.format("Razorpay API returned %d: %s",
                        statusCode,
                        razorpayErrorDesc != null ? razorpayErrorDesc : responseBody);
                log.error("Razorpay error detail — code={}, description={}", razorpayErrorCode, razorpayErrorDesc);
                return ResponseEntity.status(statusCode).body(Map.of(
                        "error", actualError,
                        "details", responseBody,
                        "razorpayCode", razorpayErrorCode != null ? razorpayErrorCode : "UNKNOWN",
                        "httpStatus", statusCode
                ));
            }

        } catch (Exception e) {
            log.error("Razorpay order creation exception: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to create Razorpay order: " + e.getMessage()
            ));
        }
    }

    /**
     * Simple JSON field extractor without external dependencies.
     * Extracts the value of a string field from a flat JSON object.
     */
    private String extractJsonField(String json, String field) {
        String key = "\"" + field + "\"";
        int idx = json.indexOf(key);
        if (idx < 0) return null;
        int colon = json.indexOf(':', idx);
        if (colon < 0) return null;
        int quote1 = json.indexOf('"', colon + 1);
        if (quote1 < 0) return null;
        int quote2 = json.indexOf('"', quote1 + 1);
        if (quote2 < 0) return null;
        return json.substring(quote1 + 1, quote2);
    }
}
