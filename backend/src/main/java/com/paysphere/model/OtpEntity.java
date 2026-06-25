package com.paysphere.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Stores one OTP record per send action.
 * otp_code is stored AES-encrypted — decrypted only during verification.
 */
@Entity
@Table(name = "otp_records")
public class OtpEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "mobile_number", length = 20)
    private String mobileNumber;

    /** AES-encrypted 6-digit OTP (Base64-encoded ciphertext). */
    @Column(name = "otp_code", length = 512)
    private String otpCode;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "verified")
    private boolean verified = false;

    @Column(name = "attempts")
    private int attempts = 0;

    /**
     * Purpose of the OTP:
     * REGISTER, LOGIN, TRANSFER, BENEFICIARY, PASSWORD_RESET
     */
    @Column(name = "purpose", length = 50)
    private String purpose;

    /**
     * Lifecycle status: PENDING, VERIFIED, EXPIRED, LOCKED
     */
    @Column(name = "status", length = 20)
    private String status = "PENDING";

    /** Twilio Message SID for delivery tracking. */
    @Column(name = "message_sid", length = 100)
    private String messageSid;

    // ── getters / setters ─────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String mobileNumber) { this.mobileNumber = mobileNumber; }

    public String getOtpCode() { return otpCode; }
    public void setOtpCode(String otpCode) { this.otpCode = otpCode; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessageSid() { return messageSid; }
    public void setMessageSid(String messageSid) { this.messageSid = messageSid; }
}
