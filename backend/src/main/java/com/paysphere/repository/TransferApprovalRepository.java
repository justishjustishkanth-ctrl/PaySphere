package com.paysphere.repository;

import com.paysphere.model.TransferApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransferApprovalRepository extends JpaRepository<TransferApproval, Long> {
    List<TransferApproval> findByStatus(String status);
}
