package com.paysphere.repository;

import com.paysphere.model.KYC;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface KYCRepository extends JpaRepository<KYC, Long> {
    List<KYC> findByUserId(Long userId);
    List<KYC> findByStatus(String status);
}
