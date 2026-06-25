package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "kyc", indexes = {
    @Index(name = "idx_kyc_user_id", columnList = "user_id")
})
@Data
public class KYC {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String pan;
    private String aadhaar;
    private String passport;
    private String address;
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED
    
    @Column(name = "document_url")
    private String documentUrl;

    @Column(name = "salesforce_id")
    private String salesforceId;
}
