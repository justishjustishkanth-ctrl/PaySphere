public with sharing class KYCController {
    public String pan { get; set; }
    public String aadhaar { get; set; }
    public String passport { get; set; }
    public String address { get; set; }
    public String documentUrl { get; set; }
    public String status { get; set; }
    
    public Id customerId { get; set; }
    public String errorMessage { get; set; }
    public Boolean hasSubmitted { get; set; }

    public KYCController() {
        hasSubmitted = false;
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            customerId = sessionCookie.getValue();
            loadKYC();
        }
    }

    public PageReference checkSession() {
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie == null || String.isBlank(sessionCookie.getValue())) {
            PageReference loginPage = Page.Login;
            loginPage.setRedirect(true);
            return loginPage;
        }
        return null;
    }

    private void loadKYC() {
        List<KYC__c> kycList = [
            SELECT Status__c, PAN__c, Aadhaar__c, Passport__c, Address__c, Document_URL__c 
            FROM KYC__c 
            WHERE Customer__c = :customerId 
            LIMIT 1
        ];
        if (!kycList.isEmpty()) {
            KYC__c kyc = kycList[0];
            pan = kyc.PAN__c;
            aadhaar = kyc.Aadhaar__c;
            passport = kyc.Passport__c;
            address = kyc.Address__c;
            documentUrl = kyc.Document_URL__c;
            status = kyc.Status__c;
            hasSubmitted = true;
        } else {
            status = 'Not Submitted';
        }
    }

    public PageReference submitKYC() {
        errorMessage = '';
        if (customerId == null) {
            errorMessage = 'Session expired. Please login again.';
            return Page.Login;
        }

        if (String.isBlank(pan) || String.isBlank(aadhaar) || String.isBlank(address)) {
            errorMessage = 'PAN, Aadhaar and Address are mandatory fields.';
            return null;
        }

        try {
            KYC__c newKyc;
            List<KYC__c> existing = [SELECT Id FROM KYC__c WHERE Customer__c = :customerId LIMIT 1];
            if (!existing.isEmpty()) {
                newKyc = existing[0];
            } else {
                newKyc = new KYC__c(Customer__c = customerId);
            }

            newKyc.PAN__c = pan;
            newKyc.Aadhaar__c = aadhaar;
            newKyc.Passport__c = passport;
            newKyc.Address__c = address;
            newKyc.Document_URL__c = String.isBlank(documentUrl) ? 'https://paysphere.com/docs/dummy_receipt.pdf' : documentUrl;
            newKyc.Status__c = 'PENDING';
            
            upsert newKyc;
            hasSubmitted = true;
            status = 'PENDING';

            // Create notification
            insert new Notification__c(
                Customer__c = customerId,
                Message__c = 'Your KYC verification request has been submitted successfully and is currently under review.',
                Type__c = 'KYC'
            );

            // Log Audit Event
            insert new Audit_Log__c(
                Action__c = 'KYC Submission',
                Details__c = 'KYC details submitted for verification',
                Username__c = customerId
            );

            return null;
        } catch (Exception e) {
            errorMessage = 'Failed to submit KYC: ' + e.getMessage();
            return null;
        }
    }
}
