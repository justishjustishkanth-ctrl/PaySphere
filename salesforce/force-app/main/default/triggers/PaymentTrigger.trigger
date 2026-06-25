trigger PaymentTrigger on Payment__c (after insert) {
    for (Payment__c p : Trigger.new) {
        System.debug('Payment logged for transfer: ' + p.Transfer_Request__c);
    }
}
