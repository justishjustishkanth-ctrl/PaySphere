package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String message;
    private String type; // PAYMENT, KYC, BENEFICIARY, TRANSFER

    @Column(name = "is_read")
    private boolean isRead = false;

    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "salesforce_id")
    private String salesforceId;
}
