trigger WebhookTrigger on Webhook_Log__c (after insert) {
    for (Webhook_Log__c w : Trigger.new) {
        System.debug('Webhook raw log recorded for event: ' + w.Event_Type__c);
    }
}
