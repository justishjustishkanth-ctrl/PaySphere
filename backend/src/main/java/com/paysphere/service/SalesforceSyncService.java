package com.paysphere.service;

import com.paysphere.client.SalesforceClient;
import com.paysphere.model.*;
import com.paysphere.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Synchronizes MySQL entities to their corresponding Salesforce custom objects.
 * Each sync method is idempotent:
 *  - If the entity already has a Salesforce ID, it performs an UPDATE (PATCH).
 *  - If not, it creates a new record and stores the returned SF ID back into MySQL.
 */
@Service
public class SalesforceSyncService {

    private static final Logger log = LoggerFactory.getLogger(SalesforceSyncService.class);

    @Autowired private SalesforceClient sfClient;
    @Autowired private ApplicationContext applicationContext;

    @Autowired private UserRepository userRepository;
    @Autowired private BeneficiaryRepository beneficiaryRepository;
    @Autowired private TransferRequestRepository transferRequestRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private KYCRepository kycRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private AuditLogRepository auditLogRepository;

    // ── User / Customer__c ────────────────────────────────────────────────────

    public User syncUser(User user) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Name", user.getFirstName() + " " + user.getLastName());
            fields.put("First_Name__c", user.getFirstName());
            fields.put("Last_Name__c", user.getLastName());
            fields.put("Email__c", user.getEmail());
            fields.put("Mobile__c", user.getMobile());
            fields.put("Mobile_Number__c", user.getMobile());
            fields.put("Role__c", user.getRole());
            fields.put("Account_Status__c", user.isLocked() ? "LOCKED" : "ACTIVE");


            if (user.getSalesforceId() == null || user.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Customer__c", fields);
                user.setSalesforceId(sfId);
                log.info("Synced NEW User {} → SF {}", user.getId(), sfId);
            } else {
                sfClient.updateRecord("Customer__c", user.getSalesforceId(), fields);
                log.info("Updated existing User {} in SF {}", user.getId(), user.getSalesforceId());
            }
            return userRepository.save(user);
        } catch (Exception e) {
            log.error("Salesforce User sync failed for userId={}: {}", user.getId(), e.getMessage());
            return user; // Non-fatal: return unsaved user so the main flow continues
        }
    }

    // ── Beneficiary__c ────────────────────────────────────────────────────────

    public Beneficiary syncBeneficiary(Beneficiary ben) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Name__c", ben.getName());
            fields.put("Country__c", ben.getCountry());
            fields.put("Bank_Name__c", ben.getBankName());
            fields.put("Account_Number__c", ben.getAccountNumber());
            fields.put("SWIFT_BIC__c", ben.getSwiftBic());
            fields.put("Mobile__c", ben.getMobile());
            fields.put("Status__c", ben.getStatus());
            if (ben.getUser() != null && ben.getUser().getSalesforceId() != null) {
                fields.put("Customer__c", ben.getUser().getSalesforceId());
            }

            if (ben.getSalesforceId() == null || ben.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Beneficiary__c", fields);
                ben.setSalesforceId(sfId);
                log.info("Synced NEW Beneficiary {} → SF {}", ben.getId(), sfId);
            } else {
                sfClient.updateRecord("Beneficiary__c", ben.getSalesforceId(), fields);
            }
            return beneficiaryRepository.save(ben);
        } catch (Exception e) {
            log.error("Salesforce Beneficiary sync failed for id={}: {}", ben.getId(), e.getMessage());
            return ben;
        }
    }

    // ── TransferRequest__c ────────────────────────────────────────────────────

    public TransferRequest syncTransferRequest(TransferRequest tr) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Amount__c", tr.getAmount());
            fields.put("Source_Currency__c", tr.getSourceCurrency());
            fields.put("Destination_Currency__c", tr.getDestinationCurrency());
            fields.put("Exchange_Rate__c", tr.getExchangeRate());
            fields.put("Transfer_Fee__c", tr.getTransferFee());
            fields.put("Receiver_Amount__c", tr.getReceiverAmount());
            fields.put("Purpose__c", tr.getPurpose());
            fields.put("Status__c", tr.getStatus());
            if (tr.getUser() != null && tr.getUser().getSalesforceId() != null) {
                fields.put("Customer__c", tr.getUser().getSalesforceId());
            }
            if (tr.getBeneficiary() != null && tr.getBeneficiary().getSalesforceId() != null) {
                fields.put("Beneficiary__c", tr.getBeneficiary().getSalesforceId());
            }

            if (tr.getSalesforceId() == null || tr.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("TransferRequest__c", fields);
                tr.setSalesforceId(sfId);
                log.info("Synced NEW TransferRequest {} → SF {}", tr.getId(), sfId);
            } else {
                sfClient.updateRecord("TransferRequest__c", tr.getSalesforceId(), fields);
            }
            return transferRequestRepository.save(tr);
        } catch (Exception e) {
            log.error("Salesforce TransferRequest sync failed for id={}: {}", tr.getId(), e.getMessage());
            return tr;
        }
    }

    // ── Payment__c ────────────────────────────────────────────────────────────

    public Payment syncPayment(Payment payment) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Order_ID__c", payment.getOrderId());
            fields.put("Payment_ID__c", payment.getPaymentId());
            fields.put("Amount__c", payment.getAmount());
            fields.put("Status__c", payment.getStatus());
            if (payment.getTransferRequest() != null && payment.getTransferRequest().getSalesforceId() != null) {
                fields.put("Transfer_Request__c", payment.getTransferRequest().getSalesforceId());
            }

            if (payment.getSalesforceId() == null || payment.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Payment__c", fields);
                payment.setSalesforceId(sfId);
                log.info("Synced NEW Payment {} → SF {}", payment.getId(), sfId);
            } else {
                sfClient.updateRecord("Payment__c", payment.getSalesforceId(), fields);
            }
            return paymentRepository.save(payment);
        } catch (Exception e) {
            log.error("Salesforce Payment sync failed for id={}: {}", payment.getId(), e.getMessage());
            return payment;
        }
    }

    // ── KYC__c ────────────────────────────────────────────────────────────────

    public KYC syncKYC(KYC kyc) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("PAN__c", kyc.getPan());
            fields.put("Aadhaar__c", kyc.getAadhaar());
            fields.put("Passport__c", kyc.getPassport());
            fields.put("Address__c", kyc.getAddress());
            fields.put("Status__c", kyc.getStatus());
            fields.put("Document_URL__c", kyc.getDocumentUrl());
            if (kyc.getUser() != null && kyc.getUser().getSalesforceId() != null) {
                fields.put("Customer__c", kyc.getUser().getSalesforceId());
            }

            if (kyc.getSalesforceId() == null || kyc.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("KYC__c", fields);
                kyc.setSalesforceId(sfId);
                log.info("Synced NEW KYC {} → SF {}", kyc.getId(), sfId);
            } else {
                sfClient.updateRecord("KYC__c", kyc.getSalesforceId(), fields);
            }
            return kycRepository.save(kyc);
        } catch (Exception e) {
            log.error("Salesforce KYC sync failed for id={}: {}", kyc.getId(), e.getMessage());
            return kyc;
        }
    }

    // ── Payment_Transaction__c ────────────────────────────────────────────────

    public Transaction syncTransaction(Transaction tx) {
        try {
            log.info("Transaction sync payload: User={}, TR={}, Payment={}, Amount={}, Currency={}, Status={}, Timestamp={}",
                    tx.getUser() != null ? tx.getUser().getId() : null,
                    tx.getTransferRequest() != null ? tx.getTransferRequest().getId() : null,
                    tx.getPayment() != null ? tx.getPayment().getId() : null,
                    tx.getAmount(), tx.getCurrency(), tx.getStatus(), tx.getTimestamp());

            Map<String, Object> fields = new LinkedHashMap<>();
            // Formatted Name: e.g. TXN_PS_000002
            String formattedName = String.format("TXN_PS_%06d", tx.getId());
            fields.put("Name", formattedName);

            if (tx.getUser() != null && tx.getUser().getSalesforceId() != null) {
                fields.put("Customer__c", tx.getUser().getSalesforceId());
            }
            fields.put("Amount__c", tx.getAmount());
            fields.put("Currency__c", tx.getCurrency());
            fields.put("Status__c", "SUCCESS"); // Per requirements: Status__c = SUCCESS
            fields.put("Payment_Method__c", "Razorpay"); // Per requirements
            // Transaction_Date__c: Current Datetime formatted in ISO 8601 UTC
            fields.put("Transaction_Date__c", java.time.Instant.now().toString());

            if (tx.getPayment() != null && tx.getPayment().getPaymentId() != null) {
                fields.put("Reference_Id__c", tx.getPayment().getPaymentId());
            }

            // Optional mappings for the other fields on Payment_Transaction__c if we want to be extra thorough:
            fields.put("MySQL_Transaction_Id__c", String.valueOf(tx.getId()));
            if (tx.getTransferRequest() != null) {
                fields.put("Transfer_Fee__c", tx.getTransferRequest().getTransferFee());
                fields.put("Exchange_Rate__c", tx.getTransferRequest().getExchangeRate());
                fields.put("Source_Amount__c", tx.getTransferRequest().getAmount());
                fields.put("Source_Currency__c", tx.getTransferRequest().getSourceCurrency());
                fields.put("Target_Amount__c", tx.getTransferRequest().getReceiverAmount());
                fields.put("Target_Currency__c", tx.getTransferRequest().getDestinationCurrency());
            }
            if (tx.getPayment() != null) {
                fields.put("Razorpay_Order_Id__c", tx.getPayment().getOrderId());
            }

            log.info("Salesforce Payment_Transaction__c Request Body: {}", fields);

            if (tx.getSalesforceId() == null || tx.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Payment_Transaction__c", fields);
                tx.setSalesforceId(sfId);
                log.info("Synced NEW Transaction {} → SF Payment_Transaction__c with Record Id: {}", tx.getId(), sfId);
            } else {
                sfClient.updateRecord("Payment_Transaction__c", tx.getSalesforceId(), fields);
                log.info("Updated existing Transaction {} in SF Payment_Transaction__c with Record Id: {}", tx.getId(), tx.getSalesforceId());
            }
            return transactionRepository.save(tx);
        } catch (Exception e) {
            log.error("Salesforce Transaction sync failed for id={}: {}", tx.getId(), e.getMessage());
            return tx;
        }
    }

    // ── Bulk full sync ────────────────────────────────────────────────────────

    /**
     * Syncs all records without a Salesforce ID to Salesforce.
     * Returns a summary of records synced by type.
     */
    public Map<String, Integer> syncAll() {
        Map<String, Integer> summary = new LinkedHashMap<>();

        List<User> unsynced = userRepository.findAll().stream()
                .filter(u -> u.getSalesforceId() == null || u.getSalesforceId().isBlank())
                .toList();
        unsynced.forEach(this::syncUser);
        summary.put("users", unsynced.size());

        List<Beneficiary> unsyncedBens = beneficiaryRepository.findAll().stream()
                .filter(b -> b.getSalesforceId() == null || b.getSalesforceId().isBlank())
                .toList();
        unsyncedBens.forEach(this::syncBeneficiary);
        summary.put("beneficiaries", unsyncedBens.size());

        List<TransferRequest> unsyncedTRs = transferRequestRepository.findAll().stream()
                .filter(t -> t.getSalesforceId() == null || t.getSalesforceId().isBlank())
                .toList();
        unsyncedTRs.forEach(this::syncTransferRequest);
        summary.put("transferRequests", unsyncedTRs.size());

        List<Payment> unsyncedPayments = paymentRepository.findAll().stream()
                .filter(p -> p.getSalesforceId() == null || p.getSalesforceId().isBlank())
                .toList();
        unsyncedPayments.forEach(this::syncPayment);
        summary.put("payments", unsyncedPayments.size());

        List<KYC> unsyncedKYCs = kycRepository.findAll().stream()
                .filter(k -> k.getSalesforceId() == null || k.getSalesforceId().isBlank())
                .toList();
        unsyncedKYCs.forEach(this::syncKYC);
        summary.put("kycs", unsyncedKYCs.size());

        List<Transaction> unsyncedTransactions = transactionRepository.findAll().stream()
                .filter(t -> t.getSalesforceId() == null || t.getSalesforceId().isBlank())
                .toList();
        unsyncedTransactions.forEach(this::syncTransaction);
        summary.put("transactions", unsyncedTransactions.size());

        List<Notification> unsyncedNotifications = notificationRepository.findAll().stream()
                .filter(n -> n.getSalesforceId() == null || n.getSalesforceId().isBlank())
                .toList();
        unsyncedNotifications.forEach(this::syncNotification);
        summary.put("notifications", unsyncedNotifications.size());

        List<AuditLog> unsyncedAuditLogs = auditLogRepository.findAll().stream()
                .filter(a -> a.getSalesforceId() == null || a.getSalesforceId().isBlank())
                .toList();
        unsyncedAuditLogs.forEach(this::syncAuditLog);
        summary.put("auditLogs", unsyncedAuditLogs.size());

        log.info("Full Salesforce sync complete: {}", summary);
        return summary;
    }

    // ── OTP_Log__c ────────────────────────────────────────────────────────────

    /**
     * Syncs an OtpAuditLog event to Salesforce OTP_Log__c.
     * If the log already has a Salesforce ID it is updated; otherwise created.
     *
     * @param log the OtpAuditLog to sync
     * @return the updated OtpAuditLog (with salesforceId set)
     */
    public com.paysphere.model.OtpAuditLog syncOtpLog(com.paysphere.model.OtpAuditLog auditLog) {
        try {
            // Look up the user's email for User_Name__c
            String userName = "unknown";
            if (auditLog.getUserId() != null) {
                userName = userRepository.findById(auditLog.getUserId())
                        .map(u -> u.getFirstName() + " " + u.getLastName()
                                + " (" + u.getEmail() + ")")
                        .orElse("userId=" + auditLog.getUserId());
            }

            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("User_Name__c",      userName);
            fields.put("Mobile_Number__c",  auditLog.getMobileNumber());
            fields.put("OTP_Status__c",     auditLog.getAction());    // SENT|VERIFIED|FAILED|...
            fields.put("Purpose__c",        auditLog.getPurpose());
            fields.put("Details__c",        auditLog.getDetails());
            fields.put("Sent_Time__c",      auditLog.getTimestamp() != null
                     ? auditLog.getTimestamp().toString() : null);
            fields.put("Verified_Time__c",  "VERIFIED".equals(auditLog.getAction())
                    ? auditLog.getTimestamp().toString() : null);
            fields.put("Attempts__c",       0); // placeholder; OtpService patches after verify

            if (auditLog.getSalesforceId() == null || auditLog.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("OTP_Log__c", fields);
                auditLog.setSalesforceId(sfId);
                log.info("Synced NEW OtpAuditLog {} → SF OTP_Log__c {}", auditLog.getId(), sfId);
            } else {
                sfClient.updateRecord("OTP_Log__c", auditLog.getSalesforceId(), fields);
                log.info("Updated OTP_Log__c {} for auditLogId={}", auditLog.getSalesforceId(), auditLog.getId());
            }

            // Persist the Salesforce ID back to MySQL
            com.paysphere.repository.OtpAuditLogRepository repo =
                    applicationContext.getBean(com.paysphere.repository.OtpAuditLogRepository.class);
            return repo.save(auditLog);
        } catch (Exception e) {
            log.error("Salesforce OTP_Log sync failed for auditLogId={}: {}",
                    auditLog.getId(), e.getMessage());
            return auditLog;
        }
    }

    // ── Notification__c ───────────────────────────────────────────────────────

    public Notification syncNotification(Notification notif) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Message__c", notif.getMessage());
            fields.put("Type__c", notif.getType());
            fields.put("Read__c", notif.isRead());
            fields.put("Title__c", "Notification: " + notif.getType());
            fields.put("Timestamp__c", notif.getTimestamp() != null ? notif.getTimestamp().toString() : java.time.Instant.now().toString());

            if (notif.getUser() != null && notif.getUser().getSalesforceId() != null) {
                fields.put("Customer__c", notif.getUser().getSalesforceId());
            }

            if (notif.getSalesforceId() == null || notif.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Notification__c", fields);
                notif.setSalesforceId(sfId);
                log.info("Synced NEW Notification {} → SF {}", notif.getId(), sfId);
            } else {
                sfClient.updateRecord("Notification__c", notif.getSalesforceId(), fields);
            }
            return notificationRepository.save(notif);
        } catch (Exception e) {
            log.error("Salesforce Notification sync failed for id={}: {}", notif.getId(), e.getMessage());
            return notif;
        }
    }

    // ── Audit_Log__c ──────────────────────────────────────────────────────────

    public AuditLog syncAuditLog(AuditLog audit) {
        try {
            Map<String, Object> fields = new LinkedHashMap<>();
            fields.put("Action__c", audit.getAction());
            fields.put("Details__c", audit.getDetails());
            fields.put("Username__c", audit.getUser());
            fields.put("Status__c", "SUCCESS");
            fields.put("Timestamp__c", audit.getTimestamp() != null ? audit.getTimestamp().toString() : java.time.Instant.now().toString());

            if (audit.getSalesforceId() == null || audit.getSalesforceId().isBlank()) {
                String sfId = sfClient.createRecord("Audit_Log__c", fields);
                audit.setSalesforceId(sfId);
                log.info("Synced NEW AuditLog {} → SF {}", audit.getId(), sfId);
            } else {
                sfClient.updateRecord("Audit_Log__c", audit.getSalesforceId(), fields);
            }
            return auditLogRepository.save(audit);
        } catch (Exception e) {
            log.error("Salesforce AuditLog sync failed for id={}: {}", audit.getId(), e.getMessage());
            return audit;
        }
    }
}

