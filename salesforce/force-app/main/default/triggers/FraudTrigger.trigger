trigger FraudTrigger on Fraud_Log__c (after insert) {
    for (Fraud_Log__c f : Trigger.new) {
        System.debug('CRITICAL: Fraud Event Flagged - ' + f.Flag_Reason__c);
    }
}
