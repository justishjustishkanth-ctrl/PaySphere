@RestResource(urlMapping='/razorpay-webhooks')
global with sharing class WebhookController {
    
    @HttpPost
    global static void handleWebhook() {
        RestRequest req = RestContext.request;
        RestResponse res = RestContext.response;
        
        String requestBody = req.requestBody.toString();
        String signature = req.headers.get('X-Razorpay-Signature');
        
        // Log incoming webhook raw payload
        Webhook_Log__c log = new Webhook_Log__c(
            Event_Type__c = 'Unknown',
            Payload__c = requestBody,
            Processed__c = false
        );
        insert log;

        try {
            // Parse payload JSON
            Map<String, Object> payloadMap = (Map<String, Object>) JSON.deserializeUntyped(requestBody);
            String event = (String) payloadMap.get('event');
            log.Event_Type__c = event;

            Map<String, Object> payloadData = (Map<String, Object>) payloadMap.get('payload');
            Map<String, Object> paymentData = (Map<String, Object>) payloadData.get('payment');
            Map<String, Object> entity = (Map<String, Object>) paymentData.get('entity');
            
            String orderId = (String) entity.get('order_id');
            String paymentId = (String) entity.get('id');
            
            // Fetch associated transfer request
            List<TransferRequest__c> requests = [
                SELECT Id, Customer__c, Amount__c 
                FROM TransferRequest__c 
                WHERE Id IN (SELECT Transfer_Request__c FROM Payment__c WHERE Order_ID__c = :orderId) 
                LIMIT 1
            ];

            if (!requests.isEmpty()) {
                TransferRequest__c tr = requests[0];
                
                if ('payment.captured'.equalsIgnoreCase(event)) {
                    tr.Status__c = 'COMPLETED';
                    update tr;
                    
                    // Create notification
                    insert new Notification__c(
                        Customer__c = tr.Customer__c,
                        Message__c = 'Webhook Notification: Your transfer payment was captured and completed.',
                        Type__c = 'PAYMENT'
                    );
                } else if ('payment.failed'.equalsIgnoreCase(event)) {
                    tr.Status__c = 'FAILED';
                    update tr;
                    
                    insert new Notification__c(
                        Customer__c = tr.Customer__c,
                        Message__c = 'Webhook Notification: Your transfer payment has failed.',
                        Type__c = 'PAYMENT'
                    );
                }
            }
            
            log.Processed__c = true;
            update log;

            res.statusCode = 200;
            res.responseBody = Blob.valueOf('{"status":"processed"}');
        } catch (Exception e) {
            System.debug('Webhook processing failed: ' + e.getMessage());
            res.statusCode = 500;
            res.responseBody = Blob.valueOf('{"error":"' + e.getMessage() + '"}');
        }
    }
}
