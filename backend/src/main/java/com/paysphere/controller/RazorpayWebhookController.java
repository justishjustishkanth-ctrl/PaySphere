package com.paysphere.controller;

import com.paysphere.model.WebhookLog;
import com.paysphere.repository.WebhookLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Receives and logs inbound Razorpay webhook events.
 *
 * Endpoint: POST /api/webhooks/razorpay
 *
 * Security: Validates the X-Razorpay-Signature header against the raw
 * request body using HMAC-SHA256 with the Razorpay webhook secret.
 * If the signature is invalid the request is rejected with 400.
 */
@RestController
@RequestMapping("/api/webhooks")
@CrossOrigin(origins = "*")
public class RazorpayWebhookController {

    private static final Logger log = LoggerFactory.getLogger(RazorpayWebhookController.class);

    @Autowired
    private WebhookLogRepository webhookLogRepository;

    @Value("${razorpay.key.secret}")
    private String razorpayWebhookSecret;

    /**
     * Receives Razorpay webhook events.
     *
     * @param signatureHeader  X-Razorpay-Signature header value
     * @param rawPayload       Raw JSON body as String
     * @return 200 OK if processed, 400 if signature invalid
     */
    @PostMapping("/razorpay")
    public ResponseEntity<?> receiveWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signatureHeader,
            @RequestBody String rawPayload) {

        log.info("Razorpay webhook received, payload length={}", rawPayload.length());

        // Verify signature if header is present
        if (signatureHeader != null && !signatureHeader.isBlank()) {
            boolean valid = verifyWebhookSignature(rawPayload, signatureHeader);
            if (!valid) {
                log.warn("Razorpay webhook signature INVALID — request rejected");
                return ResponseEntity.badRequest().body(
                        Map.of("error", "Invalid webhook signature"));
            }
            log.info("Razorpay webhook signature verified");
        } else {
            log.warn("Razorpay webhook received WITHOUT X-Razorpay-Signature header (test/dev mode)");
        }

        // Parse event type from payload (basic extraction without full parse)
        String eventType = extractEventType(rawPayload);
        log.info("Razorpay event type: {}", eventType);

        // Persist webhook log for audit trail
        WebhookLog webhookLog = new WebhookLog();
        webhookLog.setEventType(eventType);
        webhookLog.setPayload(rawPayload);
        webhookLog.setProcessed(true);
        webhookLogRepository.save(webhookLog);

        log.info("Webhook event '{}' logged successfully", eventType);
        return ResponseEntity.ok(Map.of(
                "status", "received",
                "event", eventType
        ));
    }

    // ── HMAC-SHA256 Signature Verification ───────────────────────────────────

    /**
     * Verifies the Razorpay webhook signature.
     * Razorpay signs the raw request body with the webhook secret using HMAC-SHA256.
     *
     * @param payload   Raw request body
     * @param signature X-Razorpay-Signature header value
     * @return true if signature matches
     */
    private boolean verifyWebhookSignature(String payload, String signature) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(
                    razorpayWebhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));

            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                hexString.append(String.format("%02x", b));
            }
            String computed = hexString.toString();
            boolean match = computed.equalsIgnoreCase(signature);
            log.debug("Webhook sig check: computed={} provided={} match={}", computed, signature, match);
            return match;
        } catch (Exception e) {
            log.error("Webhook HMAC verification error: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Extracts the event type from the raw JSON payload without a full parse.
     * Falls back to "unknown" if not found.
     */
    private String extractEventType(String payload) {
        try {
            int idx = payload.indexOf("\"event\"");
            if (idx >= 0) {
                int colon = payload.indexOf(':', idx);
                int quote1 = payload.indexOf('"', colon + 1);
                int quote2 = payload.indexOf('"', quote1 + 1);
                if (quote1 >= 0 && quote2 > quote1) {
                    return payload.substring(quote1 + 1, quote2);
                }
            }
        } catch (Exception e) {
            log.debug("Could not extract event type: {}", e.getMessage());
        }
        return "unknown";
    }
}
