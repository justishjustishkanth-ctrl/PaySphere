public with sharing class RegisterController {
    public String firstName { get; set; }
    public String lastName { get; set; }
    public String email { get; set; }
    public String mobile { get; set; }
    public String password { get; set; }
    public String confirmPassword { get; set; }
    
    public String errorMessage { get; set; }
    public Boolean isSuccess { get; set; }

    public RegisterController() {
        isSuccess = false;
    }

    public PageReference registerUser() {
        errorMessage = '';
        
        // Input Validations
        if (String.isBlank(firstName) || String.isBlank(lastName) || String.isBlank(email) || 
            String.isBlank(mobile) || String.isBlank(password) || String.isBlank(confirmPassword)) {
            errorMessage = 'All fields are required.';
            return null;
        }

        if (!password.equals(confirmPassword)) {
            errorMessage = 'Passwords do not match.';
            return null;
        }

        if (password.length() < 6) {
            errorMessage = 'Password must be at least 6 characters.';
            return null;
        }

        // Check Duplicate Email in Salesforce
        List<Customer__c> existing = [SELECT Id FROM Customer__c WHERE Email__c = :email LIMIT 1];
        if (!existing.isEmpty()) {
            errorMessage = 'An account with this email already exists.';
            return null;
        }

        try {
            // Hash password for secure storage
            Blob targetBlob = Blob.valueOf(password);
            Blob hash = Crypto.generateDigest('SHA-256', targetBlob);
            String hashedPassword = EncodingUtil.base64Encode(hash);

            // Create Customer__c in Salesforce
            Customer__c newCust = new Customer__c(
                First_Name__c = firstName,
                Last_Name__c = lastName,
                Email__c = email,
                Mobile__c = mobile,
                Password_Hash__c = hashedPassword,
                Locked__c = false,
                Failed_Login_Attempts__c = 0
            );
            insert newCust;

            // Trigger Asynchronous API Call to Sync with MySQL Backend
            syncUserWithBackend(firstName, lastName, email, mobile, hashedPassword);

            isSuccess = true;
            PageReference loginPage = Page.Login;
            loginPage.setRedirect(true);
            return loginPage;

        } catch (Exception e) {
            errorMessage = 'Error registering customer: ' + e.getMessage();
            return null;
        }
    }

    @future(callout=true)
    private static void syncUserWithBackend(String fName, String lName, String email, String mobile, String pwdHash) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('http://localhost:8080/api/users');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');
        
        // Construct JSON payload
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('firstName', fName);
        payload.put('lastName', lName);
        payload.put('email', email);
        payload.put('mobile', mobile);
        payload.put('password', pwdHash);
        
        request.setBody(JSON.serialize(payload));
        
        try {
            HttpResponse response = http.send(request);
            System.debug('Sync response status: ' + response.getStatus());
        } catch (Exception e) {
            System.debug('Sync callout failed: ' + e.getMessage());
        }
    }
}
