# Twilio Trial Account Limitations & Verification Guide

When using a Twilio Trial Account, there is a restriction that you can only send SMS to numbers that have been verified in the Twilio Console.
If you attempt to send an SMS to an unverified number, Twilio will reject the request with:
**Twilio Error 21608: "The number is unverified. Trial accounts cannot send messages to unverified numbers."**

To resolve this during testing and development, you have two options:

---

## Option 1: Verify the Destination Number in Twilio Console

If you want to keep using your Twilio Trial Account for free, you must manually add the phone numbers you want to test to the list of verified numbers.

### Steps to Verify a Number:

1. **Log in** to your [Twilio Console](https://console.twilio.com/).
2. In the left-hand navigation menu, expand **Phone Numbers** -> **Manage** -> **Verified Caller IDs**.
   - Direct link: [Twilio Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified-caller-ids)
3. Click the **Add a new Caller ID** button.
4. Select your country (e.g. **India**) and enter the destination phone number (e.g. `9087638248`).
5. Choose verification method: **SMS** or **Call**.
6. Click **Verify**.
7. Enter the verification code sent by Twilio to that phone number.
8. Once verified, that number will appear in the **Verified Caller IDs** list and can receive OTP messages from your trial account.

---

## Option 2: Upgrade your Twilio Account

To send SMS to any mobile number globally (including unverified numbers) without registration restrictions, you must upgrade your Twilio account from a Trial to a Paid/Full account.

### Steps to Upgrade:

1. Go to the [Twilio Console](https://console.twilio.com/).
2. Click **Upgrade Project** / **Upgrade Account** at the top of the dashboard.
3. Fill out the billing information and add a payment method.
4. Fund your account with a minimum balance.
5. Once upgraded, all restrictions on sending messages to unverified numbers are removed.
