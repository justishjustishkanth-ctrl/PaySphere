@isTest
public class TransferControllerTest {

    private static Customer__c createTestCustomer() {
        Customer__c cust = new Customer__c(
            First_Name__c = 'Test',
            Last_Name__c = 'User',
            Email__c = 'test@paysphere.com',
            Mobile__c = '9876543210',
            Password_Hash__c = 'hashpwd',
            Failed_Login_Attempts__c = 0,
            Locked__c = false
        );
        insert cust;
        return cust;
    }

    private static Beneficiary__c createTestBeneficiary(Id custId) {
        Beneficiary__c ben = new Beneficiary__c(
            Customer__c = custId,
            Name = 'Remit Recipient',
            Country__c = 'USA',
            Bank_Name__c = 'Chase Bank',
            Account_Number__c = 'ACC-12345',
            SWIFT_BIC__c = 'CHASUS33',
            Mobile__c = '1234567890',
            Status__c = 'APPROVED'
        );
        insert ben;
        return ben;
    }

    @isTest
    static void testTransferFlow() {
        Customer__c cust = createTestCustomer();
        Beneficiary__c ben = createTestBeneficiary(cust.Id);

        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());

        // Inject session cookie
        ApexPages.currentPage().getCookies().put(
            'paysphere_session',
            new Cookie('paysphere_session', cust.Id, '/', 1800, false)
        );

        Test.startTest();

        // Build controller and inject customerId via @TestVisible
        TransferController controller = new TransferController();
        controller.customerId = cust.Id; // override if cookie did not propagate

        // Test rate calculations
        controller.amount = 50000;
        controller.sourceCurrency = 'INR';
        controller.destinationCurrency = 'USD';
        controller.calculateRates();
        System.assertNotEquals(null, controller.exchangeRate, 'exchangeRate must be set');
        System.assertNotEquals(null, controller.transferFee, 'transferFee must be set');
        System.assertNotEquals(null, controller.receiverAmount, 'receiverAmount must be set');

        // Test OTP generation
        controller.selectedBeneficiaryId = ben.Id;
        controller.generateOTP();
        System.assertEquals(true, controller.otpGenerated, 'OTP must be generated');
        System.assertNotEquals(null, controller.otpCode, 'OTP code must exist');

        // Wrong OTP
        controller.inputOtp = '000000';
        controller.verifyOTP();
        System.assertEquals(false, controller.otpVerified, 'Wrong OTP must fail');

        // Correct OTP
        controller.inputOtp = controller.otpCode;
        controller.verifyOTP();
        System.assertEquals(true, controller.otpVerified, 'Correct OTP must pass');

        // Create transfer
        PageReference pr = controller.createTransferRequest();
        Test.stopTest();

        System.assertNotEquals(null, pr, 'PageReference must not be null after successful transfer');
        System.assert(pr.getUrl().toLowerCase().contains('payment'), 'Must redirect to Payment page, got: ' + pr.getUrl());

        List<TransferRequest__c> reqs = [SELECT Id, Status__c, Amount__c FROM TransferRequest__c WHERE Customer__c = :cust.Id];
        System.assertEquals(1, reqs.size(), 'One transfer request must be created');
        System.assertEquals('PENDING_PAYMENT', reqs[0].Status__c, 'Status must be PENDING_PAYMENT');
    }

    @isTest
    static void testHighValueTransferFraudLogs() {
        Customer__c cust = createTestCustomer();
        Beneficiary__c ben = createTestBeneficiary(cust.Id);

        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        ApexPages.currentPage().getCookies().put(
            'paysphere_session',
            new Cookie('paysphere_session', cust.Id, '/', 1800, false)
        );

        Test.startTest();
        TransferController controller = new TransferController();
        controller.customerId = cust.Id;
        controller.selectedBeneficiaryId = ben.Id;
        controller.amount = 150000;
        controller.sourceCurrency = 'INR';
        controller.destinationCurrency = 'USD';
        controller.calculateRates();
        controller.generateOTP();
        controller.inputOtp = controller.otpCode;
        controller.verifyOTP();

        PageReference pr = controller.createTransferRequest();
        Test.stopTest();

        List<TransferRequest__c> reqs = [SELECT Id, Status__c FROM TransferRequest__c WHERE Customer__c = :cust.Id];
        System.assertEquals(1, reqs.size(), 'One transfer request must be created');
        System.assertEquals('PENDING_APPROVAL', reqs[0].Status__c, 'High-value must be PENDING_APPROVAL');

        List<Fraud_Log__c> frauds = [SELECT Id, Flag_Reason__c FROM Fraud_Log__c WHERE Customer__c = :cust.Id];
        System.assertEquals(1, frauds.size(), 'One fraud log must be created');
        System.assertEquals('High-Value Transfer Flagged', frauds[0].Flag_Reason__c);
    }

    private class MockHttpResponseGenerator implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"status":"OK"}');
            res.setStatusCode(200);
            return res;
        }
    }
}
