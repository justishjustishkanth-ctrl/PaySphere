package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfer_requests")
@Data
public class TransferRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "beneficiary_id", nullable = false)
    private Beneficiary beneficiary;

    @Column(name = "source_currency")
    private String sourceCurrency;

    @Column(name = "destination_currency")
    private String destinationCurrency;

    private Double amount;
    private String purpose;

    @Column(name = "exchange_rate")
    private Double exchangeRate;

    @Column(name = "transfer_fee")
    private Double transferFee;

    @Column(name = "receiver_amount")
    private Double receiverAmount;

    private String status = "DRAFT"; // DRAFT, PENDING_PAYMENT, PROCESSING, APPROVED, COMPLETED, FAILED

    private String otp;

    @Column(name = "otp_generated_at")
    private LocalDateTime otpGeneratedAt;

    @Column(name = "salesforce_id")
    private String salesforceId;
}
