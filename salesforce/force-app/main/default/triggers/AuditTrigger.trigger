trigger AuditTrigger on Audit_Log__c (after insert) {
    for (Audit_Log__c a : Trigger.new) {
        System.debug('Audit log entry created: ' + a.Action__c);
    }
}
