public with sharing class FraudController {
    public static void logFraud(Id customerId, String reason, String details) {
        insert new Fraud_Log__c(
            Customer__c = customerId,
            Flag_Reason__c = reason,
            Details__c = details
        );
    }
}
