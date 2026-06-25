package com.paysphere.repository;

import com.paysphere.model.TransferRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    List<TransferRequest> findByUserId(Long userId);
    List<TransferRequest> findByStatus(String status);
}
