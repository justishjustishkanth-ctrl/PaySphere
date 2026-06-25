package com.paysphere.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "webhook_logs")
@Data
public class WebhookLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type")
    private String eventType;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String payload;

    private boolean processed = false;
    private LocalDateTime timestamp = LocalDateTime.now();
}
