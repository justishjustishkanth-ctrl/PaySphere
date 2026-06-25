public with sharing class TransferController {
    public List<SelectOption> beneficiariesOptions { get; set; }
    public String selectedBeneficiaryId { get; set; }
    public String sourceCurrency { get; set; }
    public String destinationCurrency { get; set; }
    public Decimal amount { get; set; }
    public String purpose { get; set; }

    // Calculation results
    public Decimal exchangeRate { get; set; }
    public Decimal transferFee { get; set; }
    public Decimal receiverAmount { get; set; }

    // OTP Verification Flow
    public String otpCode { get; set; }
    public String inputOtp { get; set; }
    public Boolean otpGenerated { get; set; }
    public Boolean otpVerified { get; set; }
    public Datetime otpExpiry { get; set; }

    public String errorMessage { get; set; }
    public String successMessage { get; set; }
    
    @TestVisible private Id customerId;
    private Customer__c currentCustomer;

    public TransferController() {
        sourceCurrency = 'INR';
        destinationCurrency = 'USD';
        otpGenerated = false;
        otpVerified = false;
        beneficiariesOptions = new List<SelectOption>();

        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null && String.isNotBlank(sessionCookie.getValue())) {
            customerId = sessionCookie.getValue();
            loadBeneficiaries();
            loadCustomer();
        } else if (customerId != null) {
            // Test injection path
            loadBeneficiaries();
            loadCustomer();
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

    private void loadCustomer() {
        List<Customer__c> customers = [
            SELECT Email__c, First_Name__c, Last_Name__c 
            FROM Customer__c 
            WHERE Id = :customerId 
            LIMIT 1
        ];
        if (!customers.isEmpty()) {
            currentCustomer = customers[0];
        }
    }

    private void loadBeneficiaries() {
        beneficiariesOptions.clear();
        System.debug('loadBeneficiaries - Current Customer ID: ' + customerId);
        String queryStr = 'SELECT Id, Name, Bank_Name__c, Status__c FROM Beneficiary__c WHERE Customer__c = \'' + customerId + '\'';
        System.debug('loadBeneficiaries - Query Executed: ' + queryStr);
        
        List<Beneficiary__c> bens = [
            SELECT Id, Name, Bank_Name__c, Status__c
            FROM Beneficiary__c 
            WHERE Customer__c = :customerId
        ];
        
        System.debug('loadBeneficiaries - Number of beneficiaries found: ' + bens.size());
        
        for (Beneficiary__c ben : bens) {
            System.debug('loadBeneficiaries - Beneficiary ID: ' + ben.Id + ', Name: ' + ben.Name + ', Status: ' + ben.Status__c);
            beneficiariesOptions.add(new SelectOption(ben.Id, ben.Name + ' (' + ben.Bank_Name__c + ')'));
        }
        if (beneficiariesOptions.isEmpty()) {
            errorMessage = 'Please add and get approval for beneficiaries before making a transfer.';
        }
    }

    public void calculateRates() {
        errorMessage = '';
        if (amount == null || amount <= 0) {
            errorMessage = 'Amount must be greater than 0.';
            return;
        }

        // Simulating currency rate conversions
        exchangeRate = getMockRate(sourceCurrency, destinationCurrency);
        transferFee = amount * 0.01; // 1% transfer fee
        receiverAmount = (amount - transferFee) * exchangeRate;
    }

    public void generateOTP() {
        errorMessage = '';
        successMessage = '';
        calculateRates();

        if (String.isBlank(selectedBeneficiaryId)) {
            errorMessage = 'Please select a beneficiary.';
            return;
        }

        if (amount == null || amount <= 0) {
            errorMessage = 'Please calculate rates with a valid amount first.';
            return;
        }

        // Generate 6-digit OTP
        Integer randomVal = Integer.valueOf(Math.floor(100000 + Math.random() * 900000));
        otpCode = String.valueOf(randomVal);
        System.debug('Generated OTP Code: ' + otpCode);
        otpExpiry = Datetime.now().addMinutes(5);
        otpGenerated = true;

        // Mock sending email
        sendEmailOTP(otpCode);
        successMessage = 'A 6-digit verification code has been sent to your registered email address.';
    }

    public void verifyOTP() {
        errorMessage = '';
        successMessage = '';

        if (String.isBlank(inputOtp)) {
            errorMessage = 'Please enter the verification code.';
            return;
        }

        if (Datetime.now() > otpExpiry) {
            errorMessage = 'Verification code has expired. Please generate a new one.';
            return;
        }

        if (otpCode != null && otpCode.equals(inputOtp)) {
            otpVerified = true;
            successMessage = 'OTP code successfully verified! You can proceed to create the transfer request.';
        } else {
            errorMessage = 'Incorrect code. Please try again.';
        }
    }

    public PageReference createTransferRequest() {
        errorMessage = '';
        if (!otpVerified) {
            errorMessage = 'Please complete OTP verification before proceeding.';
            return null;
        }

        try {
            // Check Fraud Trigger: Transfer > ₹100,000 requires Admin approval
            Boolean needsApproval = false;
            // Convert to INR base for comparison (assuming INR is base)
            Decimal inrValue = amount;
            if (!'INR'.equalsIgnoreCase(sourceCurrency)) {
                Decimal inrRate = getMockRate(sourceCurrency, 'INR');
                inrValue = amount * inrRate;
            }

            String targetStatus = 'PENDING_PAYMENT';
            if (inrValue > 100000) {
                needsApproval = true;
                targetStatus = 'PENDING_APPROVAL';
            }

            TransferRequest__c tr = new TransferRequest__c(
                Customer__c = customerId,
                Beneficiary__c = selectedBeneficiaryId,
                Source_Currency__c = sourceCurrency,
                Destination_Currency__c = destinationCurrency,
                Amount__c = amount,
                Purpose__c = purpose,
                Exchange_Rate__c = exchangeRate,
                Transfer_Fee__c = transferFee,
                Receiver_Amount__c = receiverAmount,
                Status__c = targetStatus
            );
            insert tr;

            if (needsApproval) {
                // Create Transfer Approval request
                insert new TransferApproval__c(
                    Transfer_Request__c = tr.Id,
                    Status__c = 'PENDING_APPROVAL',
                    Comments__c = 'High value transfer (> ₹100,000) requires administrative clearance.'
                );
                
                // Log Audit
                insert new Audit_Log__c(
                    Action__c = 'Payment Success',
                    Details__c = 'Payment succeeded for order: ' + tr.Id,
                    Username__c = String.valueOf(tr.Customer__c)
                );
                
                // Create Fraud Alert entry
                insert new Fraud_Log__c(
                    Customer__c = customerId,
                    Flag_Reason__c = 'High-Value Transfer Flagged',
                    Details__c = 'Transfer value of ' + sourceCurrency + ' ' + amount + ' exceeds ₹100,000 threshold limit.'
                );
            }

            // Create notification log
            insert new Notification__c(
                Customer__c = customerId,
                Message__c = 'Transfer Request created with status: ' + targetStatus,
                Type__c = 'TRANSFER'
            );

            // Sync with backend API
            syncTransferWithBackend(tr.Id, selectedBeneficiaryId, sourceCurrency, destinationCurrency, amount, exchangeRate, transferFee, receiverAmount, targetStatus);

            PageReference paymentPage = Page.Payment;
            paymentPage.getParameters().put('id', tr.Id);
            paymentPage.setRedirect(true);
            return paymentPage;

        } catch (Exception e) {
            errorMessage = 'Error saving transfer: ' + e.getMessage();
            return null;
        }
    }

    private void sendEmailOTP(String code) {
        if (currentCustomer == null || String.isBlank(currentCustomer.Email__c)) return;
        
        try {
            Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
            mail.setToAddresses(new String[] { currentCustomer.Email__c });
            mail.setSubject('PaySphere - OTP Verification');
            mail.setPlainTextBody('Hello ' + currentCustomer.First_Name__c + ',\n\n' +
                'Your transaction verification code is: ' + code + '\n' +
                'This code expires in 5 minutes.\n\n' +
                'If you did not initiate this transaction, please change your password immediately.\n\n' +
                'Best regards,\nPaySphere Compliance Team');
            Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });
        } catch(Exception e) {
            System.debug('Email sending simulated / failed: ' + e.getMessage());
        }
    }

    private Decimal getMockRate(String src, String dest) {
        if (src.equals(dest)) return 1.0;
        if (src.equals('USD') && dest.equals('INR')) return 83.5;
        if (src.equals('INR') && dest.equals('USD')) return 0.012;
        if (src.equals('EUR') && dest.equals('INR')) return 90.2;
        if (src.equals('GBP') && dest.equals('INR')) return 106.1;
        if (src.equals('AED') && dest.equals('INR')) return 22.7;
        if (src.equals('SGD') && dest.equals('INR')) return 61.8;
        return 1.0;
    }

    @future(callout=true)
    private static void syncTransferWithBackend(Id trId, Id benId, String srcCur, String destCur, Decimal amt, Decimal rate, Decimal fee, Decimal recAmt, String status) {
        Http http = new Http();
        HttpRequest request = new HttpRequest();
        request.setEndpoint('http://localhost:8080/api/transfer-requests');
        request.setMethod('POST');
        request.setHeader('Content-Type', 'application/json');

        Map<String, Object> payload = new Map<String, Object>();
        payload.put('sourceCurrency', srcCur);
        payload.put('destinationCurrency', destCur);
        payload.put('amount', amt);
        payload.put('exchangeRate', rate);
        payload.put('transferFee', fee);
        payload.put('receiverAmount', recAmt);
        payload.put('status', status);

        Map<String, Object> userRef = new Map<String, Object>();
        userRef.put('id', 1);
        payload.put('user', userRef);

        Map<String, Object> benRef = new Map<String, Object>();
        benRef.put('id', 1);
        payload.put('beneficiary', benRef);

        request.setBody(JSON.serialize(payload));
        
        try {
            http.send(request);
        } catch (Exception e) {
            System.debug('Sync transfer request failed: ' + e.getMessage());
        }
    }
}
