trigger NotificationTrigger on Notification__c (after insert) {
    for (Notification__c n : Trigger.new) {
        System.debug('New notification logged: ' + n.Message__c);
    }
}
