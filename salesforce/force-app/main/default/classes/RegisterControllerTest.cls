@isTest
public class RegisterControllerTest {
    @isTest
    static void testRegisterValidation() {
        RegisterController controller = new RegisterController();
        
        // Test Blank Inputs
        controller.registerUser();
        System.assertNotEquals('', controller.errorMessage);
        
        // Test Passwords Mismatch
        controller.firstName = 'John';
        controller.lastName = 'Doe';
        controller.email = 'john.doe@test.com';
        controller.mobile = '9876543210';
        controller.password = 'password123';
        controller.confirmPassword = 'differentPassword';
        controller.registerUser();
        System.assertEquals('Passwords do not match.', controller.errorMessage);
        
        // Test Short Password
        controller.password = '123';
        controller.confirmPassword = '123';
        controller.registerUser();
        System.assertEquals('Password must be at least 6 characters.', controller.errorMessage);
    }
    
    @isTest
    static void testRegisterSuccessAndDuplicate() {
        // Mock Http Callout
        Test.setMock(HttpCalloutMock.class, new MockHttpResponseGenerator());
        
        RegisterController controller = new RegisterController();
        controller.firstName = 'John';
        controller.lastName = 'Doe';
        controller.email = 'john.doe@test.com';
        controller.mobile = '9876543210';
        controller.password = 'securepwd';
        controller.confirmPassword = 'securepwd';
        
        Test.startTest();
        PageReference pr = controller.registerUser();
        Test.stopTest();
        
        System.assertNotEquals(null, pr);
        System.assertEquals(true, controller.isSuccess);
        
        // Test Duplicate Register
        RegisterController dupController = new RegisterController();
        dupController.firstName = 'John';
        dupController.lastName = 'Doe';
        dupController.email = 'john.doe@test.com';
        dupController.mobile = '9876543210';
        dupController.password = 'securepwd';
        dupController.confirmPassword = 'securepwd';
        dupController.registerUser();
        System.assertEquals('An account with this email already exists.', dupController.errorMessage);
    }

    // Mock Http Callout Generator
    private class MockHttpResponseGenerator implements HttpCalloutMock {
        public HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setBody('{"status":"SUCCESS"}');
            res.setStatusCode(200);
            return res;
        }
    }
}
