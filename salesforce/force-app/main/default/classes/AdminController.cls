public with sharing class AdminController {
    public List<KYC__c> pendingKYC { get; set; }
    public List<Beneficiary__c> pendingBeneficiaries { get; set; }
    public List<TransferApproval__c> pendingApprovals { get; set; }
    public List<Fraud_Log__c> activeFraudLogs { get; set; }
    
    // Summary Metrics
    public Integer totalUsers { get; set; }
    public Decimal totalRevenue { get; set; }
    public Integer totalTransactions { get; set; }

    public Id recordId { get; set; }
    public String adminComments { get; set; }
    public String errorMessage { get; set; }
    public String successMessage { get; set; }

    public AdminController() {
        loadDashboard();
    }

    public void loadDashboard() {
        errorMessage = '';
        
        // Pending KYC
        pendingKYC = [
            SELECT Id, Customer__r.First_Name__c, Customer__r.Last_Name__c, PAN__c, Aadhaar__c, Passport__c, Status__c 
            FROM KYC__c 
            WHERE Status__c = 'PENDING'
        ];

        // Pending Beneficiary
        pendingBeneficiaries = [
            SELECT Id, Customer__r.First_Name__c, Customer__r.Last_Name__c, Name, Bank_Name__c, Account_Number__c, Country__c, Status__c 
            FROM Beneficiary__c 
            WHERE Status__c = 'PENDING'
        ];

        // Pending Transfer Approvals (> ₹100,000)
        pendingApprovals = [
            SELECT Id, Transfer_Request__c, Transfer_Request__r.Customer__r.First_Name__c, Transfer_Request__r.Customer__r.Last_Name__c, 
                   Transfer_Request__r.Amount__c, Transfer_Request__r.Source_Currency__c, Transfer_Request__r.Destination_Currency__c, Status__c 
            FROM TransferApproval__c 
            WHERE Status__c = 'PENDING_APPROVAL'
        ];

        // Active Fraud Logs
        activeFraudLogs = [
            SELECT Id, Customer__r.First_Name__c, Customer__r.Last_Name__c, Flag_Reason__c, Details__c, Timestamp__c 
            FROM Fraud_Log__c 
            ORDER BY Timestamp__c DESC 
            LIMIT 10
        ];

        // Metrics calculations
        totalUsers = [SELECT count() FROM Customer__c];
        totalTransactions = [SELECT count() FROM Transaction__c WHERE Status__c = 'SUCCESS'];
        
        totalRevenue = 0;
        for (Transaction__c tx : [SELECT Amount__c FROM Transaction__c WHERE Status__c = 'SUCCESS']) {
            totalRevenue += (tx.Amount__c != null ? tx.Amount__c : 0.0);
        }
    }

    public void approveKYC() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                KYC__c kyc = [SELECT Id, Customer__c FROM KYC__c WHERE Id = :recordId LIMIT 1];
                kyc.Status__c = 'APPROVED';
                update kyc;

                insert new Notification__c(
                    Customer__c = kyc.Customer__c,
                    Message__c = 'Your KYC verification request has been APPROVED by the administrator.',
                    Type__c = 'KYC'
                );

                successMessage = 'KYC approved successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'KYC approval failed: ' + e.getMessage();
            }
        }
    }

    public void rejectKYC() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                KYC__c kyc = [SELECT Id, Customer__c FROM KYC__c WHERE Id = :recordId LIMIT 1];
                kyc.Status__c = 'REJECTED';
                update kyc;

                insert new Notification__c(
                    Customer__c = kyc.Customer__c,
                    Message__c = 'Your KYC verification request was REJECTED: ' + adminComments,
                    Type__c = 'KYC'
                );

                successMessage = 'KYC rejected successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'KYC rejection failed: ' + e.getMessage();
            }
        }
    }

    public void approveBeneficiary() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                Beneficiary__c ben = [SELECT Id, Customer__c, Name FROM Beneficiary__c WHERE Id = :recordId LIMIT 1];
                ben.Status__c = 'APPROVED';
                update ben;

                insert new Notification__c(
                    Customer__c = ben.Customer__c,
                    Message__c = 'Beneficiary "' + ben.Name + '" has been APPROVED and is active.',
                    Type__c = 'BENEFICIARY'
                );

                successMessage = 'Beneficiary approved successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'Beneficiary approval failed: ' + e.getMessage();
            }
        }
    }

    public void rejectBeneficiary() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                Beneficiary__c ben = [SELECT Id, Customer__c, Name FROM Beneficiary__c WHERE Id = :recordId LIMIT 1];
                ben.Status__c = 'REJECTED';
                update ben;

                insert new Notification__c(
                    Customer__c = ben.Customer__c,
                    Message__c = 'Beneficiary "' + ben.Name + '" was REJECTED.',
                    Type__c = 'BENEFICIARY'
                );

                successMessage = 'Beneficiary rejected successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'Beneficiary rejection failed: ' + e.getMessage();
            }
        }
    }

    public void approveTransfer() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                TransferApproval__c app = [SELECT Id, Transfer_Request__c, Transfer_Request__r.Customer__c, Transfer_Request__r.Amount__c FROM TransferApproval__c WHERE Id = :recordId LIMIT 1];
                app.Status__c = 'APPROVED';
                app.Comments__c = adminComments;
                update app;

                TransferRequest__c tr = [SELECT Id FROM TransferRequest__c WHERE Id = :app.Transfer_Request__c LIMIT 1];
                tr.Status__c = 'PENDING_PAYMENT'; // Move back to payment lifecycle
                update tr;

                insert new Notification__c(
                    Customer__c = app.Transfer_Request__r.Customer__c,
                    Message__c = 'Your high-value transfer request of amount ' + app.Transfer_Request__r.Amount__c + ' has been APPROVED by the administrator.',
                    Type__c = 'TRANSFER'
                );

                successMessage = 'Transfer approved successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'Transfer approval failed: ' + e.getMessage();
            }
        }
    }

    public void rejectTransfer() {
        errorMessage = '';
        successMessage = '';
        if (recordId != null) {
            try {
                TransferApproval__c app = [SELECT Id, Transfer_Request__c, Transfer_Request__r.Customer__c, Transfer_Request__r.Amount__c FROM TransferApproval__c WHERE Id = :recordId LIMIT 1];
                app.Status__c = 'REJECTED';
                app.Comments__c = adminComments;
                update app;

                TransferRequest__c tr = [SELECT Id FROM TransferRequest__c WHERE Id = :app.Transfer_Request__c LIMIT 1];
                tr.Status__c = 'FAILED';
                update tr;

                insert new Notification__c(
                    Customer__c = app.Transfer_Request__r.Customer__c,
                    Message__c = 'Your high-value transfer request of amount ' + app.Transfer_Request__r.Amount__c + ' was REJECTED: ' + adminComments,
                    Type__c = 'TRANSFER'
                );

                successMessage = 'Transfer rejected successfully.';
                loadDashboard();
            } catch (Exception e) {
                errorMessage = 'Transfer rejection failed: ' + e.getMessage();
            }
        }
    }
}
