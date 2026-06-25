@isTest
public class WebhookControllerTest {
    @isTest
    static void testWebhookCapturedEvent() {
        // Setup Customer
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

        // Setup Beneficiary
        Beneficiary__c ben = new Beneficiary__c(
            Customer__c = cust.Id,
            Name = 'Beneficiary',
            Country__c = 'USA',
            Bank_Name__c = 'Bank',
            Account_Number__c = '1234',
            SWIFT_BIC__c = 'SWIFTBIC',
            Status__c = 'APPROVED'
        );
        insert ben;

        // Setup Transfer Request
        TransferRequest__c tr = new TransferRequest__c(
            Customer__c = cust.Id,
            Beneficiary__c = ben.Id,
            Source_Currency__c = 'INR',
            Destination_Currency__c = 'USD',
            Amount__c = 5000,
            Exchange_Rate__c = 0.012,
            Transfer_Fee__c = 50,
            Receiver_Amount__c = 59.4,
            Status__c = 'PENDING_PAYMENT'
        );
        insert tr;

        // Setup Payment record matching order id
        Payment__c p = new Payment__c(
            Transfer_Request__c = tr.Id,
            Order_ID__c = 'order_test_captured',
            Payment_ID__c = 'pay_captured_123',
            Signature__c = 'sig_test_captured',
            Amount__c = 5000,
            Status__c = 'SUCCESS'
        );
        insert p;

        // Simulate REST request for captured event
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();
        req.requestURI = '/services/apexrest/razorpay-webhooks';
        req.httpMethod = 'POST';
        req.headers.put('X-Razorpay-Signature', 'mock_webhook_signature');
        
        String jsonPayload = '{' + 
            '"event":"payment.captured",' +
            '"payload":{' +
                '"payment":{' +
                    '"entity":{' +
                        '"id":"pay_captured_123",' +
                        '"order_id":"order_test_captured"' +
                    '}' +
                '}' +
            '}' +
        '}';
        req.requestBody = Blob.valueOf(jsonPayload);
        
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        WebhookController.handleWebhook();
        Test.stopTest();

        System.assertEquals(200, res.statusCode);
        
        // Assert status transitioned to COMPLETED
        TransferRequest__c updatedTr = [SELECT Status__c FROM TransferRequest__c WHERE Id = :tr.Id];
        System.assertEquals('COMPLETED', updatedTr.Status__c);
    }

    @isTest
    static void testWebhookFailedEvent() {
        // Setup Customer
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

        // Setup Beneficiary
        Beneficiary__c ben = new Beneficiary__c(
            Customer__c = cust.Id,
            Name = 'Beneficiary',
            Country__c = 'USA',
            Bank_Name__c = 'Bank',
            Account_Number__c = '1234',
            SWIFT_BIC__c = 'SWIFTBIC',
            Status__c = 'APPROVED'
        );
        insert ben;

        // Setup Transfer Request
        TransferRequest__c tr = new TransferRequest__c(
            Customer__c = cust.Id,
            Beneficiary__c = ben.Id,
            Source_Currency__c = 'INR',
            Destination_Currency__c = 'USD',
            Amount__c = 5000,
            Exchange_Rate__c = 0.012,
            Transfer_Fee__c = 50,
            Receiver_Amount__c = 59.4,
            Status__c = 'PENDING_PAYMENT'
        );
        insert tr;

        // Setup Payment record matching order id
        Payment__c p = new Payment__c(
            Transfer_Request__c = tr.Id,
            Order_ID__c = 'order_test_failed',
            Payment_ID__c = 'pay_failed_123',
            Signature__c = 'sig_test_failed',
            Amount__c = 5000,
            Status__c = 'SUCCESS'
        );
        insert p;

        // Simulate REST request for failed event
        RestRequest req = new RestRequest();
        RestResponse res = new RestResponse();
        req.requestURI = '/services/apexrest/razorpay-webhooks';
        req.httpMethod = 'POST';
        
        String jsonPayload = '{' + 
            '"event":"payment.failed",' +
            '"payload":{' +
                '"payment":{' +
                    '"entity":{' +
                        '"id":"pay_failed_123",' +
                        '"order_id":"order_test_failed"' +
                    '}' +
                '}' +
            '}' +
        '}';
        req.requestBody = Blob.valueOf(jsonPayload);
        
        RestContext.request = req;
        RestContext.response = res;

        Test.startTest();
        WebhookController.handleWebhook();
        Test.stopTest();

        System.assertEquals(200, res.statusCode);
        
        // Assert status transitioned to FAILED
        TransferRequest__c updatedTr = [SELECT Status__c FROM TransferRequest__c WHERE Id = :tr.Id];
        System.assertEquals('FAILED', updatedTr.Status__c);
    }
}
