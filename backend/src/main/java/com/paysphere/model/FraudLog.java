package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "fraud_logs")
@Data
public class FraudLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String details;

    @Column(name = "flag_reason")
    private String flagReason;

    private LocalDateTime timestamp = LocalDateTime.now();
}
