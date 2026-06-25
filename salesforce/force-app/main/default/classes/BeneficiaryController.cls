public with sharing class BeneficiaryController {
    public List<Beneficiary__c> beneficiaries { get; set; }
    public String searchName { get; set; }
    
    // Beneficiary form inputs
    public Id editId { get; set; }
    public String name { get; set; }
    public String country { get; set; }
    public String bankName { get; set; }
    public String accountNumber { get; set; }
    public String swiftBic { get; set; }
    public String mobile { get; set; }

    public String errorMessage { get; set; }
    public String successMessage { get; set; }
    private Id customerId;

    public BeneficiaryController() {
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            customerId = sessionCookie.getValue();
            loadBeneficiaries();
        } else {
            errorMessage = 'Session expired. Please log in.';
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

    public void loadBeneficiaries() {
        errorMessage = '';
        String q = 'SELECT Id, Name, Country__c, Bank_Name__c, Account_Number__c, SWIFT_BIC__c, Mobile__c, Status__c ' +
                   'FROM Beneficiary__c WHERE Customer__c = :customerId';
        if (String.isNotBlank(searchName)) {
            String likeVal = '%' + searchName + '%';
            q += ' AND Name LIKE :likeVal';
        }
        beneficiaries = Database.query(q);
    }

    public PageReference addBeneficiary() {
        errorMessage = '';
        successMessage = '';

        if (String.isBlank(name) || String.isBlank(country) || String.isBlank(bankName) || 
            String.isBlank(accountNumber) || String.isBlank(swiftBic)) {
            errorMessage = 'Please fill in all mandatory fields.';
            return null;
        }

        try {
            Beneficiary__c ben = new Beneficiary__c(
                Customer__c = customerId,
                Name = name,
                Country__c = country,
                Bank_Name__c = bankName,
                Account_Number__c = accountNumber,
                SWIFT_BIC__c = swiftBic,
                Mobile__c = mobile,
                Status__c = 'PENDING'
            );
            insert ben;

            // Sync with backend API
            syncBeneficiaryWithBackend('POST', ben.Id, name, country, bankName, accountNumber, swiftBic, mobile, 'PENDING');

            successMessage = 'Beneficiary added successfully. Awaiting verification.';
            clearForm();
            loadBeneficiaries();
            return null;
        } catch (Exception e) {
            errorMessage = 'Error adding beneficiary: ' + e.getMessage();
            return null;
        }
    }

    public void deleteBeneficiary() {
        errorMessage = '';
        successMessage = '';
        if (editId != null) {
            try {
                Beneficiary__c ben = [SELECT Id FROM Beneficiary__c WHERE Id = :editId LIMIT 1];
                delete ben;
                
                // Sync with backend API
                syncBeneficiaryDelete(editId);

                successMessage = 'Beneficiary deleted successfully.';
                loadBeneficiaries();
            } catch (Exception e) {
                errorMessage = 'Error deleting beneficiary: ' + e.getMessage();
            }
        }
    }

    private void clearForm() {
        editId = null;
        name = '';
        country = '';
        bankName = '';
        accountNumber = '';
        swiftBic = '';
        mobile = '';
    }

    @future(callout=true)
    private static void syncBeneficiaryWithBackend(String method, Id sfId, String name, String country, String bankName, String accNum, String swift, String mobile, String status) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('http://localhost:8080/api/beneficiaries');
        request.setMethod(method);
        request.setHeader('Content-Type', 'application/json');

        Map<String, Object> payload = new Map<String, Object>();
        payload.put('name', name);
        payload.put('country', country);
        payload.put('bankName', bankName);
        payload.put('accountNumber', accNum);
        payload.put('swiftBic', swift);
        payload.put('mobile', mobile);
        payload.put('status', status);

        // Include linked user id
        Map<String, Object> userRef = new Map<String, Object>();
        userRef.put('id', 1); // Mock mapping user id
        payload.put('user', userRef);

        request.setBody(JSON.serialize(payload));
        
        try {
            http.send(request);
        } catch (Exception e) {
            System.debug('Sync beneficiary failed: ' + e.getMessage());
        }
    }

    @future(callout=true)
    private static void syncBeneficiaryDelete(Id sfId) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('http://localhost:8080/api/beneficiaries/1'); // Mock delete
        request.setMethod('DELETE');
        try {
            http.send(request);
        } catch (Exception e) {
            System.debug('Sync beneficiary delete failed: ' + e.getMessage());
        }
    }
}
