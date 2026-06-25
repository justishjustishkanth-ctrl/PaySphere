package com.paysphere;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class PaySphereApplication {

    private static final Logger log = LoggerFactory.getLogger(PaySphereApplication.class);

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    public static void main(String[] args) {
        SpringApplication.run(PaySphereApplication.class, args);
    }

    @Bean
    public CommandLineRunner verifyRazorpayConfig() {
        return args -> {
            log.info("====================================================");
            log.info("RAZORPAY CONFIGURATION VERIFICATION AT STARTUP");
            log.info("Loaded Razorpay Key ID: {}", razorpayKeyId);

            if (razorpayKeyId != null) {
                if (razorpayKeyId.startsWith("rzp_test_")) {
                    log.info("Razorpay Mode Detected: TEST MODE (rzp_test_...)");
                } else if (razorpayKeyId.startsWith("rzp_live_")) {
                    log.info("Razorpay Mode Detected: LIVE MODE (rzp_live_...)");
                } else {
                    log.warn("Razorpay Mode Detected: UNKNOWN PREFIX (Key: {})", razorpayKeyId);
                }
            } else {
                log.error("Razorpay Key ID is NULL!");
            }

            // Check if environment variables are overriding
            String envKeyId = System.getenv("RAZORPAY_KEY_ID");
            String envKeyIdLower = System.getenv("razorpay.key.id");
            if (envKeyId != null) {
                log.info("Found environment variable 'RAZORPAY_KEY_ID': {}", envKeyId);
                if (!envKeyId.equals(razorpayKeyId)) {
                    log.warn("WARNING: Environment variable 'RAZORPAY_KEY_ID' overrides application.properties!");
                }
            }
            if (envKeyIdLower != null) {
                log.info("Found environment variable 'razorpay.key.id': {}", envKeyIdLower);
                if (!envKeyIdLower.equals(razorpayKeyId)) {
                    log.warn("WARNING: Environment variable 'razorpay.key.id' overrides application.properties!");
                }
            }
            log.info("====================================================");
        };
    }
}

