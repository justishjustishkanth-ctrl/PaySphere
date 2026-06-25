package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", indexes = {
    @Index(name = "idx_transactions_user_id", columnList = "user_id"),
    @Index(name = "idx_transactions_payment_id", columnList = "payment_id")
})
@Data
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "transfer_request_id")
    private TransferRequest transferRequest;

    @ManyToOne
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private Double amount;
    private String currency;
    private String status;
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "salesforce_id")
    private String salesforceId;
}
