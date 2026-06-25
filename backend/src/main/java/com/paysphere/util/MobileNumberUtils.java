package com.paysphere.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Utility class for Indian mobile number validation and E.164 formatting.
 *
 * Twilio requires phone numbers in E.164 format: +[country code][number]
 * For India: +91XXXXXXXXXX (where X is 10-digit mobile starting with 6/7/8/9)
 *
 * This class handles all permutations:
 *   "8754758789"      → "+918754758789"
 *   "+918754758789"   → "+918754758789"  (no change)
 *   "918754758789"    → "+918754758789"
 *   "08754758789"     → "+918754758789"  (leading zero stripped)
 *   "0918754758789"   → "+918754758789"
 */
public final class MobileNumberUtils {

    private static final Logger log = LoggerFactory.getLogger(MobileNumberUtils.class);

    private MobileNumberUtils() {} // prevent instantiation

    /**
     * Formats an Indian mobile number to E.164 format (+91XXXXXXXXXX).
     *
     * @param mobile raw mobile number input from user or database
     * @return E.164 formatted number like +918754758789
     * @throws RuntimeException if the number is invalid
     */
    public static String formatIndianMobileNumber(String mobile) {
        if (mobile == null || mobile.isBlank()) {
            throw new RuntimeException("Please enter a valid Indian mobile number.");
        }

        // Strip all whitespace, dashes, parentheses
        String cleaned = mobile.replaceAll("[\\s\\-().]", "");

        // Remove leading + for processing
        String withoutPlus = cleaned.startsWith("+") ? cleaned.substring(1) : cleaned;

        // Remove leading zeros (e.g., 08754758789 or 0918754758789)
        while (withoutPlus.startsWith("0")) {
            withoutPlus = withoutPlus.substring(1);
        }

        // Must be all digits at this point
        if (!withoutPlus.matches("^[0-9]+$")) {
            throw new RuntimeException("Please enter a valid Indian mobile number.");
        }

        String tenDigits;

        if (withoutPlus.length() == 10) {
            // Raw 10-digit number: 8754758789
            tenDigits = withoutPlus;
        } else if (withoutPlus.length() == 12 && withoutPlus.startsWith("91")) {
            // 12 digits starting with 91: 918754758789
            tenDigits = withoutPlus.substring(2);
        } else {
            throw new RuntimeException(
                    "Please enter a valid Indian mobile number. Expected 10 digits, got: " + mobile);
        }

        // Validate Indian mobile: must start with 6, 7, 8, or 9
        if (!tenDigits.matches("^[6-9][0-9]{9}$")) {
            throw new RuntimeException(
                    "Please enter a valid Indian mobile number. Must start with 6, 7, 8, or 9.");
        }

        // Reject all-same-digit numbers (e.g., 9999999999)
        if (tenDigits.matches("^(\\d)\\1{9}$")) {
            throw new RuntimeException(
                    "Please enter a valid Indian mobile number. Cannot be all identical digits.");
        }

        String formatted = "+91" + tenDigits;
        log.debug("Mobile formatted: original={} → formatted={}", mobile, formatted);
        return formatted;
    }

    /**
     * Validates that a mobile number can be formatted to E.164.
     * Does NOT throw — returns true/false.
     */
    public static boolean isValidIndianMobile(String mobile) {
        try {
            formatIndianMobileNumber(mobile);
            return true;
        } catch (RuntimeException e) {
            return false;
        }
    }

    /** Mask all but last 4 digits for safe logging. */
    public static String mask(String mobile) {
        if (mobile == null || mobile.length() < 4) return "****";
        return "*".repeat(mobile.length() - 4) + mobile.substring(mobile.length() - 4);
    }
}
