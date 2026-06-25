public with sharing class TransactionController {
    public List<Transaction__c> transactions { get; set; }
    
    // Filter properties
    public String searchId { get; set; }
    public String searchPaymentId { get; set; }
    public String filterStatus { get; set; }

    private Id customerId;

    public TransactionController() {
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            customerId = sessionCookie.getValue();
            searchTransactions();
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

    public void searchTransactions() {
        String q = 'SELECT Name, Amount__c, Currency__c, Status__c, Timestamp__c, Transfer_Request__c, ' +
                   'Transfer_Request__r.Beneficiary__r.Name ' +
                   'FROM Transaction__c WHERE Customer__c = :customerId';

        if (String.isNotBlank(searchId)) {
            String likeId = '%' + searchId + '%';
            q += ' AND Name LIKE :likeId';
        }
        if (String.isNotBlank(searchPaymentId)) {
            String likePayId = '%' + searchPaymentId + '%';
            q += ' AND Payment_ID_Text__c LIKE :likePayId';
        }
        if (String.isNotBlank(filterStatus) && !'ALL'.equalsIgnoreCase(filterStatus)) {
            q += ' AND Status__c = :filterStatus';
        }

        q += ' ORDER BY Timestamp__c DESC';
        transactions = Database.query(q);
    }
}
