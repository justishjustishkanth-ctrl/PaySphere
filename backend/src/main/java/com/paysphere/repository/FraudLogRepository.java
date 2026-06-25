package com.paysphere.repository;

import com.paysphere.model.FraudLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FraudLogRepository extends JpaRepository<FraudLog, Long> {
    List<FraudLog> findByUserId(Long userId);
}
