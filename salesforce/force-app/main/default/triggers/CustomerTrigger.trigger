trigger CustomerTrigger on Customer__c (after insert, after update) {
    for (Customer__c c : Trigger.new) {
        if (Trigger.isInsert) {
            System.debug('Customer created: ' + c.Email__c);
        }
    }
}
