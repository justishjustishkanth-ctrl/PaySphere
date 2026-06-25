trigger BeneficiaryTrigger on Beneficiary__c (before insert, before update) {
    for (Beneficiary__c b : Trigger.new) {
        if (String.isBlank(b.SWIFT_BIC__c)) {
            b.addError('SWIFT/BIC Code is mandatory for cross-border beneficiaries.');
        }
    }
}
