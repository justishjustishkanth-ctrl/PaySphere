public with sharing class ProfileController {
    public Customer__c customer { get; set; }
    public String kycStatus { get; set; }

    public ProfileController() {
        Cookie sessionCookie = ApexPages.currentPage().getCookies().get('paysphere_session');
        if (sessionCookie != null) {
            Id customerId = sessionCookie.getValue();
            List<Customer__c> custs = [
                SELECT Id, First_Name__c, Last_Name__c, Email__c, Mobile__c, CreatedDate 
                FROM Customer__c 
                WHERE Id = :customerId 
                LIMIT 1
            ];
            if (!custs.isEmpty()) {
                customer = custs[0];
                
                // Get KYC Status
                List<KYC__c> kycList = [SELECT Status__c FROM KYC__c WHERE Customer__c = :customerId LIMIT 1];
                kycStatus = kycList.isEmpty() ? 'NOT_SUBMITTED' : kycList[0].Status__c;
            }
        }
    }
}
