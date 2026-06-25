public with sharing class DashboardController {
    public Customer__c currentCustomer { get; set; }
    public Decimal totalPayments { get; set; }
    public Integer successfulPayments { get; set; }
    public Integer failedPayments { get; set; }
    public Integer pendingRequests { get; set; }
    
    public List<Transaction__c> recentTransactions { get; set; }
    public List<Notification__c> recentNotifications { get; set; }
    public List<ExchangeRate__c> exchangeRates { get; set; }

    public String errorMessage { get; set; }

    public DashboardController() {
        totalPayments = 0.0;
        successfulPayments = 0;
        failedPayments = 0;
        pendingRequests = 0;
        recentTransactions = new List<Transaction__c>();
        recentNotifications = new List<Notification__c>();
        exchangeRates = new List<ExchangeRate__c>();

        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            Id customerId = sessionCookie.getValue();
            loadDashboardData(customerId);
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

    private void loadDashboardData(Id customerId) {
        List<Customer__c> customers = [
            SELECT Id, First_Name__c, Last_Name__c, Email__c 
            FROM Customer__c 
            WHERE Id = :customerId 
            LIMIT 1
        ];

        if (customers.isEmpty()) {
            return;
        }
        currentCustomer = customers[0];

        // Total payments & counts
        for (Transaction__c tx : [
            SELECT Amount__c, Status__c 
            FROM Transaction__c 
            WHERE Customer__c = :customerId
        ]) {
            if ('SUCCESS'.equalsIgnoreCase(tx.Status__c) || 'COMPLETED'.equalsIgnoreCase(tx.Status__c)) {
                totalPayments += (tx.Amount__c != null ? tx.Amount__c : 0.0);
                successfulPayments++;
            } else if ('FAILED'.equalsIgnoreCase(tx.Status__c)) {
                failedPayments++;
            }
        }

        // Pending transfer requests
        pendingRequests = [
            SELECT count() 
            FROM TransferRequest__c 
            WHERE Customer__c = :customerId AND Status__c = 'PENDING_PAYMENT'
        ];

        // Recent Transactions
        recentTransactions = [
            SELECT Name, Amount__c, Currency__c, Status__c, Timestamp__c 
            FROM Transaction__c 
            WHERE Customer__c = :customerId 
            ORDER BY Timestamp__c DESC 
            LIMIT 5
        ];

        // Recent Notifications
        recentNotifications = [
            SELECT Message__c, Timestamp__c, Type__c 
            FROM Notification__c 
            WHERE Customer__c = :customerId 
            ORDER BY Timestamp__c DESC 
            LIMIT 5
        ];

        // Exchange rates history
        exchangeRates = [
            SELECT Source_Currency__c, Destination_Currency__c, Rate__c, Timestamp__c 
            FROM ExchangeRate__c 
            ORDER BY Timestamp__c DESC 
            LIMIT 6
        ];
    }
}
