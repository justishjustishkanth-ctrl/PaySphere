package com.paysphere.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.rest.api.v2010.Account;
import com.twilio.rest.api.v2010.account.OutgoingCallerId;
import com.twilio.base.ResourceSet;
import com.twilio.type.PhoneNumber;
import com.twilio.exception.ApiException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.paysphere.util.MobileNumberUtils;

/**
 * SMS delivery service using Twilio SMS API.
 *
 * All OTP SMS messages are dispatched via Twilio. The raw OTP value
 * is NEVER logged, stored in plaintext, or exposed in any response.
 *
 * The sendOtp method returns the Twilio Message SID for delivery tracking.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    @Value("${twilio.account.sid}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token}")
    private String twilioAuthToken;

    @Value("${twilio.from.number}")
    private String twilioFromNumber;

    @Value("${sms.provider:console}")
    private String smsProvider;

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        log.info("SmsService initialized with provider: {}", smsProvider);
        if (!"twilio".equalsIgnoreCase(smsProvider)) {
            log.info("Twilio initialization skipped: SMS provider is set to {}", smsProvider);
            return;
        }

        if (twilioAccountSid == null || twilioAccountSid.isBlank() || twilioAccountSid.startsWith("YOUR_")) {
            throw new IllegalStateException("Twilio configuration error: twilio.account.sid is missing, blank, or a placeholder.");
        }
        if (twilioAuthToken == null || twilioAuthToken.isBlank() || twilioAuthToken.startsWith("YOUR_")) {
            throw new IllegalStateException("Twilio configuration error: twilio.auth.token is missing, blank, or a placeholder.");
        }
        if (twilioFromNumber == null || twilioFromNumber.isBlank() || twilioFromNumber.startsWith("YOUR_")) {
            throw new IllegalStateException("Twilio configuration error: twilio.from.number is missing, blank, or a placeholder.");
        }

        try {
            Twilio.init(twilioAccountSid, twilioAuthToken);
            initialized = true;
            log.info("Twilio SDK initialized successfully (SID={}...)", twilioAccountSid.substring(0, Math.min(8, twilioAccountSid.length())));
        } catch (Exception e) {
            log.error("Twilio SDK initialization failed: {}", e.getMessage());
            throw new IllegalStateException("Twilio SDK initialization failed: " + e.getMessage(), e);
        }
    }

    /**
     * Sends an OTP SMS to the given mobile number via Twilio.
     *
     * @param mobileNumber E.164 format, e.g. +919876543210
     * @param otp          Plain-text 6-digit OTP (NEVER logged or stored)
     * @param purpose      Human-readable purpose label in the SMS body
     * @return Twilio Message SID for delivery tracking
     * @throws RuntimeException if Twilio delivery fails
     */
    public String sendOtp(String mobileNumber, String otp, String purpose) {
        long startTime = System.currentTimeMillis();
        String formattedMobile = MobileNumberUtils.formatIndianMobileNumber(mobileNumber);
        String messageBody = buildMessage(otp, purpose);

        log.info("[SMS API REQUEST] Attempting to send OTP SMS. Original Mobile: {}, Formatted Mobile: {}, Provider: {}, Expiry Check: Pending",
                MobileNumberUtils.mask(mobileNumber),
                MobileNumberUtils.mask(formattedMobile),
                smsProvider);

        if (!"twilio".equalsIgnoreCase(smsProvider)) {
            log.info("\n==================================================\n" +
                     "CONSOLE SMS PROVIDER - OUTGOING MESSAGE:\n" +
                     "To: {}\n" +
                     "Message: {}\n" +
                     "==================================================",
                     MobileNumberUtils.mask(formattedMobile), messageBody);
            log.info("[SMS API RESPONSE] Console SMS provider completed. Mock Message SID: MOCK_CONSOLE_SMS_SID_..., Status: Delivered");
            return "MOCK_CONSOLE_SMS_SID_" + System.currentTimeMillis();
        }

        if (!initialized) {
            log.error("[SMS CONFIG ERROR] Twilio SDK is not initialized. Twilio credentials or sender number are missing/invalid in application.properties.");
            throw new RuntimeException("Twilio SDK not initialized. Check twilio.account.sid, twilio.auth.token, twilio.from.number in application.properties.");
        }

        // Verify Twilio Trial Restrictions
        try {
            log.info("[SMS TRIAL CHECK] Fetching Twilio Account info to check type...");
            Account account = Account.fetcher(twilioAccountSid).fetch();
            log.info("[SMS TRIAL CHECK] Twilio account type is: {}", account.getType());
            if (account.getType() == Account.Type.TRIAL) {
                boolean verified = false;
                log.info("[SMS TRIAL CHECK] Fetching verified caller IDs from Twilio...");
                ResourceSet<OutgoingCallerId> callerIds = OutgoingCallerId.reader().read();
                for (OutgoingCallerId record : callerIds) {
                    if (record.getPhoneNumber() != null && record.getPhoneNumber().toString().equals(formattedMobile)) {
                        verified = true;
                        break;
                    }
                }
                if (!verified) {
                    long duration = System.currentTimeMillis() - startTime;
                    log.error("[SMS TRIAL CHECK FAILED] Destination number is not verified in Twilio Trial Account:\n- Target: {}\n- Error Code: 21608\n- Processing time: {}ms",
                            formattedMobile, duration);
                    throw new RuntimeException("Destination number is not verified in Twilio Trial Account");
                }
                log.info("[SMS TRIAL CHECK SUCCESS] Destination number is verified in Twilio Trial Account.");
            }
        } catch (ApiException e) {
            if (e.getCode() != null && e.getCode() == 21608) {
                long duration = System.currentTimeMillis() - startTime;
                log.error("[SMS TRIAL CHECK FAILED] Destination number is not verified in Twilio Trial Account (Twilio API Code 21608):\n- Target: {}\n- Processing time: {}ms",
                        formattedMobile, duration);
                throw new RuntimeException("Destination number is not verified in Twilio Trial Account", e);
            }
            log.warn("[SMS TRIAL CHECK WARN] Failed to query Twilio account details: {}. Continuing message send attempt anyway.", e.getMessage());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[SMS TRIAL CHECK WARN] Failed to verify Twilio Trial restrictions: {}. Continuing message send attempt anyway.", e.getMessage());
        }

        try {
            log.info("[SMS TWILIO SEND] Executing Twilio message creation: To={}, From={}, BodyLength={}",
                    MobileNumberUtils.mask(formattedMobile), twilioFromNumber, messageBody.length());
            Message message = Message.creator(
                    new PhoneNumber(formattedMobile),
                    new PhoneNumber(twilioFromNumber),
                    messageBody
            ).create();

            String sid = message.getSid();
            String status = message.getStatus() != null ? message.getStatus().toString() : "unknown";
            long duration = System.currentTimeMillis() - startTime;

            log.info("[SMS API RESPONSE] Twilio message created successfully:\n- Message SID: {}\n- Delivery Status: {}\n- Destination: {}\n- Twilio Sender: {}\n- Processing Time: {}ms",
                    sid,
                    status,
                    MobileNumberUtils.mask(formattedMobile),
                    twilioFromNumber,
                    duration);
            return sid;
        } catch (ApiException e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("[SMS API ERROR] Twilio request rejected (Twilio API Error):\n- Error Code: {}\n- Error Message: {}\n- Target: {}\n- Processing Time: {}ms",
                    e.getCode(),
                    e.getMessage(),
                    formattedMobile,
                    duration);
            if (e.getCode() != null && e.getCode() == 21608) {
                throw new RuntimeException("SMS could not be delivered because this phone number is not verified in the Twilio Trial Account. Verify the number in Twilio Console or upgrade the Twilio account.", e);
            }
            throw new RuntimeException("SMS delivery failed (Twilio error " + (e.getCode() != null ? e.getCode() : "unknown") + "): " + e.getMessage(), e);
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("[SMS API ERROR] Twilio request failed (Generic Exception):\n- Error Message: {}\n- Target: {}\n- Processing Time: {}ms",
                    e.getMessage(),
                    formattedMobile,
                    duration);
            throw new RuntimeException("SMS delivery failed: " + e.getMessage(), e);
        }
    }

    /**
     * Sends a plain notification SMS (no OTP) via Twilio.
     */
    public void sendNotification(String mobileNumber, String messageText) {
        String formattedMobile;
        try {
            formattedMobile = MobileNumberUtils.formatIndianMobileNumber(mobileNumber);
        } catch (Exception e) {
            log.warn("Notification SMS failed: Invalid mobile number format for original={}: {}",
                    MobileNumberUtils.mask(mobileNumber), e.getMessage());
            return;
        }

        log.info("Notification SMS dispatch → Original Mobile: {}, Formatted Mobile: {}, Provider: {}",
                MobileNumberUtils.mask(mobileNumber),
                MobileNumberUtils.mask(formattedMobile),
                smsProvider);

        if (!"twilio".equalsIgnoreCase(smsProvider)) {
            log.info("\n==================================================\n" +
                     "CONSOLE SMS PROVIDER - OUTGOING NOTIFICATION:\n" +
                     "To: {}\n" +
                     "Message: {}\n" +
                     "==================================================",
                     MobileNumberUtils.mask(formattedMobile), messageText);
            return;
        }

        if (!initialized) {
            log.warn("Twilio not initialized — skipping notification SMS");
            return;
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber(formattedMobile),
                    new PhoneNumber(twilioFromNumber),
                    messageText
            ).create();
            log.info("Notification SMS sent → SID={} status={}", message.getSid(), message.getStatus());
        } catch (Exception e) {
            // Notification failures are non-fatal
            log.warn("Notification SMS failed: {}", e.getMessage());
        }
    }

    /**
     * Sends a test SMS to verify Twilio connectivity. Returns the Message SID.
     *
     * @param mobileNumber target phone number in E.164 format
     * @return Twilio Message SID
     */
    public String sendTestSms(String mobileNumber) {
        String formattedMobile = MobileNumberUtils.formatIndianMobileNumber(mobileNumber);
        log.info("Test SMS requested → Original Mobile: {}, Formatted Mobile: {}, Provider: {}",
                MobileNumberUtils.mask(mobileNumber),
                MobileNumberUtils.mask(formattedMobile),
                smsProvider);

        if (!"twilio".equalsIgnoreCase(smsProvider)) {
            log.info("\n==================================================\n" +
                     "CONSOLE SMS PROVIDER - OUTGOING TEST SMS:\n" +
                     "To: {}\n" +
                     "Message: PaySphere Test SMS: Your integration is working correctly.\n" +
                     "==================================================",
                     MobileNumberUtils.mask(formattedMobile));
            return "MOCK_CONSOLE_TEST_SMS_SID_" + System.currentTimeMillis();
        }

        if (!initialized) {
            throw new RuntimeException("Twilio SDK not initialized. Configure credentials in application.properties.");
        }

        try {
            Message message = Message.creator(
                    new PhoneNumber(formattedMobile),
                    new PhoneNumber(twilioFromNumber),
                    "PaySphere Test SMS: Your Twilio integration is working correctly."
            ).create();

            String sid = message.getSid();
            String status = message.getStatus() != null ? message.getStatus().toString() : "unknown";
            log.info("Test SMS Send Success: Original Mobile: {}, Formatted Mobile: {}, Twilio From: {}, Message SID: {}, Delivery Status: {}",
                    MobileNumberUtils.mask(mobileNumber),
                    MobileNumberUtils.mask(formattedMobile),
                    twilioFromNumber,
                    sid,
                    status);
            return sid;
        } catch (ApiException e) {
            log.error("Test SMS Send Failed (Twilio API Error):\n- Twilio SID: N/A\n- Destination Number: {}\n- Twilio Error Code: {}\n- Twilio Error Message: {}",
                    formattedMobile,
                    e.getCode(),
                    e.getMessage());
            if (e.getCode() != null && e.getCode() == 21608) {
                throw new RuntimeException("SMS could not be delivered because this phone number is not verified in the Twilio Trial Account. Verify the number in Twilio Console or upgrade the Twilio account.", e);
            }
            throw new RuntimeException("Test SMS failed (Twilio error " + (e.getCode() != null ? e.getCode() : "unknown") + "): " + e.getMessage(), e);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String buildMessage(String otp, String purpose) {
        String purposeLabel = switch (purpose.toUpperCase()) {
            case "LOGIN"          -> "Login Verification";
            case "REGISTER"       -> "Account Registration";
            case "TRANSFER"       -> "Money Transfer Authorization";
            case "BENEFICIARY"    -> "Beneficiary Addition";
            case "PASSWORD_RESET" -> "Password Reset";
            default               -> "Verification";
        };
        return "PaySphere OTP: " + otp
                + " for " + purposeLabel
                + ". Valid for 5 minutes. Do not share this code with anyone.";
    }

    /** Mask all but last 4 digits of mobile number for safe logging. */
    private String maskMobile(String mobile) {
        if (mobile == null || mobile.length() < 4) return "****";
        return "*".repeat(mobile.length() - 4) + mobile.substring(mobile.length() - 4);
    }
}
