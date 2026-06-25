package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfer_approvals")
@Data
public class TransferApproval {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "transfer_request_id", nullable = false)
    private TransferRequest transferRequest;

    private String approver;
    private String status = "PENDING_APPROVAL"; // PENDING_APPROVAL, APPROVED, REJECTED, COMPLETED
    private String comments;
    private LocalDateTime timestamp = LocalDateTime.now();
}
