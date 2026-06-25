package com.paysphere.controller;

import com.paysphere.model.AuditLog;
import com.paysphere.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@CrossOrigin(origins = "*")
public class AuditLogController {

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private com.paysphere.service.SalesforceSyncService syncService;

    @PostMapping
    public ResponseEntity<AuditLog> createAuditLog(@RequestBody AuditLog log) {
        AuditLog saved = auditLogRepository.save(log);
        try {
            syncService.syncAuditLog(saved);
        } catch (Exception e) {
            // non-fatal
        }
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public List<AuditLog> getAuditLogs(@RequestParam(required = false) String username) {
        if (username != null) {
            return auditLogRepository.findByUserOrderByTimestampDesc(username);
        }
        return auditLogRepository.findAll();
    }
}
