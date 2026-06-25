public with sharing class OTPController {
    public String generateOTP() {
        return String.valueOf(Integer.valueOf(Math.floor(100000 + Math.random() * 900000)));
    }
}
