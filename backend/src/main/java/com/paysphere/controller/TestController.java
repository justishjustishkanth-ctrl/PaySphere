package com.paysphere.controller;

import com.paysphere.service.SmsService;
import com.twilio.rest.api.v2010.account.Message;
import com.paysphere.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for testing SMS delivery.
 * Exposes /api/test/sms endpoint.
 */
@RestController
@RequestMapping("/api/test")
@CrossOrigin(origins = "*")
public class TestController {

    private static final Logger log = LoggerFactory.getLogger(TestController.class);

    @Autowired
    private SmsService smsService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public ResponseEntity<?> getUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * Endpoint to send a test SMS and verify its delivery via the Twilio API.
     * Request body: { "mobile": "+919876543210" }
     */
    @PostMapping("/sms")
    public ResponseEntity<?> sendTestSms(@RequestBody Map<String, String> body) {
        String mobile = body.get("mobile");
        if (mobile == null || mobile.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Mobile number is required"
            ));
        }

        log.info("API request to send test SMS to mobile={}", mobile);

        try {
            // Send the test SMS via Twilio
            String sid = smsService.sendTestSms(mobile);

            // Fetch the message from Twilio to verify delivery / status
            Message fetchedMessage = Message.fetcher(sid).fetch();
            String status = fetchedMessage.getStatus().toString();
            String twilioPhoneNumber = fetchedMessage.getFrom().toString();
            String toPhoneNumber = fetchedMessage.getTo();

            log.info("Twilio API verification: SID={}, status={}, to={}", sid, status, toPhoneNumber);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Test SMS successfully sent and verified.",
                    "messageSid", sid,
                    "status", status,
                    "from", twilioPhoneNumber,
                    "to", toPhoneNumber
            ));
        } catch (Exception e) {
            log.error("Test SMS verification failed: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "error", "Failed to send or verify SMS: " + e.getMessage()
            ));
        }
    }
}
