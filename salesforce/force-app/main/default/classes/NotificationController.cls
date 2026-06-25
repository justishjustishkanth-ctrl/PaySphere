public with sharing class NotificationController {
    public List<Notification__c> notifications { get; set; }

    public NotificationController() {
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            Id customerId = sessionCookie.getValue();
            notifications = [
                SELECT Message__c, Timestamp__c, Type__c, Read__c 
                FROM Notification__c 
                WHERE Customer__c = :customerId 
                ORDER BY Timestamp__c DESC
            ];
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
}
