package com.paysphere.repository;

import com.paysphere.model.WebhookLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WebhookLogRepository extends JpaRepository<WebhookLog, Long> {
    List<WebhookLog> findByProcessed(boolean processed);
}
