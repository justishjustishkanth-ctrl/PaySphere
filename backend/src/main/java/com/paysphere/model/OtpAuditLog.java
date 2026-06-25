package com.paysphere.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Immutable audit record written for every OTP lifecycle event:
 * SENT, VERIFIED, FAILED, EXPIRED, LOCKED, RESENT
 */
@Entity
@Table(name = "otp_audit_logs")
public class OtpAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "mobile_number", length = 20)
    private String mobileNumber;

    /** One of: SENT | VERIFIED | FAILED | EXPIRED | LOCKED | RESENT */
    @Column(name = "action", length = 30)
    private String action;

    @Column(name = "purpose", length = 50)
    private String purpose;

    @Column(name = "details", length = 500)
    private String details;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    /** Salesforce OTP_Log__c record ID once synced. */
    @Column(name = "salesforce_id", length = 50)
    private String salesforceId;

    // ── getters / setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getSalesforceId() { return salesforceId; }
    public void setSalesforceId(String salesforceId) { this.salesforceId = salesforceId; }
}
