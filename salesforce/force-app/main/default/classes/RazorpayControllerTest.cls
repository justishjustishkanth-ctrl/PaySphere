@isTest
public class RazorpayControllerTest {
    @isTest
    static void testPaymentCheckoutFlow() {
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

        // Setup Approved Beneficiary
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

        // Test with Callout mock
        Test.setMock(HttpCalloutMock.class, new MockRazorpayOrderResponse());

        // Set current page parameter
        ApexPages.currentPage().getParameters().put('id', tr.Id);

        Test.startTest();
        RazorpayController controller = new RazorpayController();
        System.assertEquals('order_mock12345', controller.orderId, 
            'Order ID should be order_mock12345 from mock, got: ' + controller.orderId);
        
        // Fail signature verification test
        controller.paymentId = 'pay_failed';
        controller.signature = 'bad_sig';
        controller.verifyPayment();
        System.assertEquals(false, controller.paymentSuccess, 'Bad signature must fail');
        
        // Success signature verification test (mock_ prefix bypasses HMAC check)
        controller.paymentId = 'pay_success';
        controller.signature = 'mock_success_sig';
        PageReference pr = controller.verifyPayment();
        Test.stopTest();

        System.assertNotEquals(null, pr, 'Successful payment must redirect to History page');
        // Page.History returns /apex/History — just verify redirect is non-null
        System.assertNotEquals(null, pr.getUrl(), 'Redirect URL must not be null after payment');
        System.assertEquals(true, controller.paymentSuccess, 'Payment success flag must be true');
        
        // Assert Payment__c is inserted
        List<Payment__c> payments = [SELECT Id, Order_ID__c, Status__c FROM Payment__c WHERE Transfer_Request__c = :tr.Id];
        System.assertEquals(1, payments.size(), 'One Payment record must be created');
        System.assertEquals('SUCCESS', payments[0].Status__c, 'Payment status must be SUCCESS');
    }

    private class MockRazorpayOrderResponse implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"id":"order_mock12345", "amount":500000, "currency":"INR", "receipt":"rcpt_mock"}');
            res.setStatusCode(200);
            return res;
        }
    }
}
