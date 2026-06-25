package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;
    private String details;
    
    @Column(name = "username")
    private String user;
    
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "salesforce_id")
    private String salesforceId;
}
