public with sharing class LoginController {
    public String email { get; set; }
    public String password { get; set; }
    public String errorMessage { get; set; }

    public PageReference login() {
        errorMessage = '';
        
        if (String.isBlank(email) || String.isBlank(password)) {
            errorMessage = 'Email and Password are required.';
            return null;
        }

        List<Customer__c> customers = [
            SELECT Id, First_Name__c, Last_Name__c, Email__c, Password_Hash__c, Failed_Login_Attempts__c, Locked__c 
            FROM Customer__c 
            WHERE Email__c = :email 
            LIMIT 1
        ];

        if (customers.isEmpty()) {
            errorMessage = 'Invalid email or password.';
            return null;
        }

        Customer__c cust = customers[0];

        if (cust.Locked__c) {
            errorMessage = 'Your account has been locked due to 5 failed login attempts. Contact support.';
            logFraudAttempt(cust.Id, 'Failed login attempt on locked account');
            return null;
        }

        // Hash input password
        Blob targetBlob = Blob.valueOf(password);
        Blob hash = Crypto.generateDigest('SHA-256', targetBlob);
        String hashedInput = EncodingUtil.base64Encode(hash);

        if (cust.Password_Hash__c != null && cust.Password_Hash__c.equals(hashedInput)) {
            // Success
            cust.Failed_Login_Attempts__c = 0;
            update cust;

            // Set session cookie
            ApexPages.currentPage().setCookies(new Cookie[]{
                new Cookie('paysphere_session', cust.Id, '/', 1800, false)
            });

            // Log Audit event
            logAuditEvent(cust.Email__c, 'User Login', 'User logged in successfully');

            PageReference dashboard = Page.Dashboard;
            dashboard.setRedirect(true);
            return dashboard;
        } else {
            // Failed attempt
            Decimal attempts = cust.Failed_Login_Attempts__c == null ? 0 : cust.Failed_Login_Attempts__c;
            attempts++;
            cust.Failed_Login_Attempts__c = attempts;
            
            if (attempts >= 5) {
                cust.Locked__c = true;
                errorMessage = 'Your account has been locked due to 5 failed login attempts.';
                logFraudAttempt(cust.Id, 'Account locked: Too many failed login attempts');
            } else {
                errorMessage = 'Invalid email or password. Attempts left: ' + (5 - attempts);
            }
            update cust;
            return null;
        }
    }

    public PageReference logout() {
        // Clear session cookie
        ApexPages.currentPage().setCookies(new Cookie[]{
            new Cookie('paysphere_session', '', '/', 0, false)
        });
        
        logAuditEvent(email, 'User Logout', 'User logged out');
        PageReference loginPage = Page.Login;
        loginPage.setRedirect(true);
        return loginPage;
    }

    private void logFraudAttempt(Id customerId, String reason) {
        Fraud_Log__c fl = new Fraud_Log__c(
            Customer__c = customerId,
            Flag_Reason__c = reason,
            Details__c = 'Failed logins threshold breached or attempted access.'
        );
        insert fl;
    }

    private void logAuditEvent(String username, String action, String details) {
        Audit_Log__c al = new Audit_Log__c(
            Action__c = action,
            Details__c = details,
            Username__c = username
        );
        insert al;
    }
}
