trigger TransferTrigger on TransferRequest__c (before insert, before update) {
    for (TransferRequest__c tr : Trigger.new) {
        if (tr.Amount__c > 100000 && 'INR'.equalsIgnoreCase(tr.Source_Currency__c) && tr.Status__c == 'DRAFT') {
            tr.Status__c = 'PENDING_APPROVAL';
        }
    }
}
