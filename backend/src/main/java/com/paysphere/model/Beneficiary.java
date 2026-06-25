package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "beneficiaries", indexes = {
    @Index(name = "idx_beneficiaries_user_id", columnList = "user_id")
})
@Data
public class Beneficiary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String name;
    private String country;

    @Column(name = "bank_name")
    private String bankName;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "swift_bic")
    private String swiftBic;

    private String mobile;
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    @Column(name = "salesforce_id")
    private String salesforceId;
}
