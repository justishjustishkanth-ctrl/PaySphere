package com.paysphere.repository;

import com.paysphere.model.OtpAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OtpAuditLogRepository extends JpaRepository<OtpAuditLog, Long> {

    List<OtpAuditLog> findByUserIdOrderByTimestampDesc(Long userId);

    List<OtpAuditLog> findByMobileNumberOrderByTimestampDesc(String mobileNumber);

    List<OtpAuditLog> findByActionOrderByTimestampDesc(String action);

    List<OtpAuditLog> findAllByOrderByTimestampDesc();
}
