public with sharing class ReceiptController {
    public Transaction__c transactionRecord { get; set; }
    public String customerName { get; set; }
    public String beneficiaryName { get; set; }

    public ReceiptController() {
        String txId = ApexPages.currentPage().getParameters().get('txid');
        if (String.isNotBlank(txId)) {
            List<Transaction__c> txs = [
                SELECT Name, Amount__c, Currency__c, Status__c, Timestamp__c, 
                       Customer__r.First_Name__c, Customer__r.Last_Name__c,
                       Transfer_Request__r.Beneficiary__r.Name,
                       Transfer_Request__r.Exchange_Rate__c,
                       Transfer_Request__r.Receiver_Amount__c,
                       Transfer_Request__r.Destination_Currency__c
                FROM Transaction__c 
                WHERE Id = :txId 
                LIMIT 1
            ];
            if (!txs.isEmpty()) {
                transactionRecord = txs[0];
                customerName = transactionRecord.Customer__r.First_Name__c + ' ' + transactionRecord.Customer__r.Last_Name__c;
                beneficiaryName = transactionRecord.Transfer_Request__r.Beneficiary__r.Name;
            }
        }
    }
}
