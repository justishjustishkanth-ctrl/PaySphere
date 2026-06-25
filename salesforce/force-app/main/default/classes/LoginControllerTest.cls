@isTest
public class LoginControllerTest {
    @isTest
    static void testLoginValidation() {
        LoginController controller = new LoginController();
        
        // Blank validation
        controller.login();
        System.assertEquals('Email and Password are required.', controller.errorMessage);
        
        // Invalid email validation
        controller.email = 'nonexistent@test.com';
        controller.password = 'password';
        controller.login();
        System.assertEquals('Invalid email or password.', controller.errorMessage);
    }

    @isTest
    static void testLoginSuccessAndLockout() {
        // Setup Customer
        Blob targetBlob = Blob.valueOf('password123');
        Blob hash = Crypto.generateDigest('SHA-256', targetBlob);
        String hashedPwd = EncodingUtil.base64Encode(hash);
        
        Customer__c cust = new Customer__c(
            First_Name__c = 'Test',
            Last_Name__c = 'User',
            Email__c = 'test@paysphere.com',
            Mobile__c = '9876543210',
            Password_Hash__c = hashedPwd,
            Failed_Login_Attempts__c = 0,
            Locked__c = false
        );
        insert cust;

        // Test Success Login
        LoginController controller = new LoginController();
        controller.email = 'test@paysphere.com';
        controller.password = 'password123';
        
        PageReference pr = controller.login();
        System.assertNotEquals(null, pr, 'Successful login must return a page redirect');
        // Page.Dashboard returns /apex/Dashboard — verify redirect URL is non-null
        System.assertNotEquals(null, pr.getUrl(), 'Redirect URL must not be null');

        // Test Logout
        PageReference logoutPr = controller.logout();
        System.assertNotEquals(null, logoutPr, 'Logout must redirect');
        System.assertNotEquals(null, logoutPr.getUrl(), 'Logout URL must not be null');

        // Test Failed Attempts Lockout
        LoginController failController = new LoginController();
        failController.email = 'test@paysphere.com';
        failController.password = 'wrongpwd';
        
        // 1st failed attempt
        failController.login();
        System.assert(failController.errorMessage.contains('Attempts left: 4'), 
            'Expected Attempts left: 4, got: ' + failController.errorMessage);

        // 2nd, 3rd, 4th failed attempts
        failController.login();
        failController.login();
        failController.login();
        
        // 5th failed attempt -> locks account
        failController.login();
        System.assertEquals('Your account has been locked due to 5 failed login attempts.', failController.errorMessage);

        // Subsequent attempt on locked account
        failController.login();
        System.assertEquals('Your account has been locked due to 5 failed login attempts. Contact support.', failController.errorMessage);
    }
}
