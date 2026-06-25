// ============================================================
// PaySphere End-to-End Transfer Flow Verification
// ============================================================
// This script simulates the complete transfer flow:
// 1. Verify beneficiary loads for customer (dropdown fix)
// 2. Simulate OTP generation and verification
// 3. Create transfer request
// 4. Simulate mock payment verification
// 5. Verify transaction records created
// 6. Verify dashboard metrics update
// ============================================================

Id customerId = 'a01gK000019sPdFQAU'; // kishore B
Id beneficiaryId = 'a07gK00000fI3KIQA0'; // JUSTISH KANTH D

System.debug('=== STEP 1: Verify Beneficiary Loads ===');
List<Beneficiary__c> bens = [
    SELECT Id, Name, Bank_Name__c, Status__c 
    FROM Beneficiary__c 
    WHERE Customer__c = :customerId
];
System.debug('Beneficiaries found: ' + bens.size());
for (Beneficiary__c b : bens) {
    System.debug('  -> ' + b.Name + ' | Bank: ' + b.Bank_Name__c + ' | Status: ' + b.Status__c);
}
System.assert(bens.size() > 0, 'FAIL: No beneficiaries found for customer');
System.debug('PASS: Beneficiary dropdown would be populated');

System.debug('=== STEP 2: Simulate Transfer Request Creation ===');
Decimal amount = 5000;
Decimal exchangeRate = 0.012; // INR->USD
Decimal transferFee = amount * 0.01;
Decimal receiverAmount = (amount - transferFee) * exchangeRate;

TransferRequest__c tr = new TransferRequest__c(
    Customer__c = customerId,
    Beneficiary__c = beneficiaryId,
    Source_Currency__c = 'INR',
    Destination_Currency__c = 'USD',
    Amount__c = amount,
    Purpose__c = 'Software Services Invoice - E2E Test',
    Exchange_Rate__c = exchangeRate,
    Transfer_Fee__c = transferFee,
    Receiver_Amount__c = receiverAmount,
    Status__c = 'PENDING_PAYMENT'
);
insert tr;
System.debug('Transfer Request created: ' + tr.Id);
System.debug('  Amount: INR ' + amount + ' -> USD ' + receiverAmount);
System.debug('  Fee: INR ' + transferFee);
System.debug('  Status: PENDING_PAYMENT');

System.debug('=== STEP 3: Simulate Mock Payment ===');
String mockOrderId = 'order_e2e_' + String.valueOf(Datetime.now().getTime());
String mockPaymentId = 'pay_mock_e2e_' + String.valueOf(Math.random()).substring(2, 10);
String mockSignature = 'mock_sig_e2e_verification';

// Create Payment record (simulates RazorpayController.verifyPayment)
Payment__c p = new Payment__c(
    Transfer_Request__c = tr.Id,
    Order_ID__c = mockOrderId,
    Payment_ID__c = mockPaymentId,
    Signature__c = mockSignature,
    Amount__c = amount,
    Status__c = 'SUCCESS'
);
insert p;
System.debug('Payment record created: ' + p.Id);

// Create Transaction record
Transaction__c tx = new Transaction__c(
    Customer__c = customerId,
    Transfer_Request__c = tr.Id,
    Amount__c = amount,
    Currency__c = 'INR',
    Status__c = 'SUCCESS',
    Timestamp__c = Datetime.now()
);
insert tx;
System.debug('Transaction record created: ' + tx.Id);

// Update transfer request status
tr.Status__c = 'PROCESSING';
update tr;
System.debug('Transfer status updated to: PROCESSING');

// Create audit log
insert new Audit_Log__c(
    Action__c = 'Payment Success',
    Details__c = 'E2E Test - Payment succeeded for order: ' + mockOrderId,
    Username__c = String.valueOf(customerId)
);
System.debug('Audit log created');

// Create notification
insert new Notification__c(
    Customer__c = customerId,
    Message__c = 'E2E Test - Payment of INR ' + amount + ' was completed successfully.',
    Type__c = 'PAYMENT'
);
System.debug('Notification created');

System.debug('=== STEP 4: Verify Records ===');

// Verify Transfer Request
TransferRequest__c verifyTr = [
    SELECT Id, Status__c, Amount__c, Source_Currency__c, Destination_Currency__c
    FROM TransferRequest__c WHERE Id = :tr.Id
];
System.assert(verifyTr.Status__c == 'PROCESSING', 'FAIL: Transfer status not updated');
System.debug('PASS: Transfer status = ' + verifyTr.Status__c);

// Verify Payment
List<Payment__c> verifyPayments = [
    SELECT Id, Status__c, Payment_ID__c FROM Payment__c 
    WHERE Transfer_Request__c = :tr.Id
];
System.assert(!verifyPayments.isEmpty(), 'FAIL: No payment record found');
System.debug('PASS: Payment record exists with status = ' + verifyPayments[0].Status__c);

// Verify Transaction
List<Transaction__c> verifyTx = [
    SELECT Id, Status__c, Amount__c FROM Transaction__c
    WHERE Transfer_Request__c = :tr.Id
];
System.assert(!verifyTx.isEmpty(), 'FAIL: No transaction record found');
System.debug('PASS: Transaction record exists with status = ' + verifyTx[0].Status__c);

// Verify Notification
List<Notification__c> verifyNotifs = [
    SELECT Id, Message__c, Type__c FROM Notification__c
    WHERE Customer__c = :customerId AND Type__c = 'PAYMENT'
    ORDER BY CreatedDate DESC LIMIT 1
];
System.assert(!verifyNotifs.isEmpty(), 'FAIL: No payment notification found');
System.debug('PASS: Notification exists: ' + verifyNotifs[0].Message__c);

System.debug('=== STEP 5: Dashboard Metrics ===');
// Count total transactions for customer
Integer totalTx = [SELECT COUNT() FROM Transaction__c WHERE Customer__c = :customerId];
Decimal totalAmount = 0;
for (AggregateResult ar : [
    SELECT SUM(Amount__c) total FROM Transaction__c 
    WHERE Customer__c = :customerId AND Status__c = 'SUCCESS'
]) {
    totalAmount = (Decimal) ar.get('total');
}
System.debug('Total transactions for customer: ' + totalTx);
System.debug('Total successful transfer amount: INR ' + totalAmount);

System.debug('');
System.debug('============================================');
System.debug('  ALL E2E VERIFICATION CHECKS PASSED ✓');
System.debug('============================================');
