package com.paysphere.controller;

import com.paysphere.service.SalesforceSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for manually triggering or checking Salesforce sync operations.
 * Endpoints:
 *   POST /api/sync/salesforce       - trigger full sync of all unsynced records
 *   GET  /api/sync/salesforce/status - return a summary (placeholder for future health checks)
 */
@RestController
@RequestMapping("/api/sync")
@CrossOrigin(origins = "*")
public class SalesforceSyncController {

    private static final Logger log = LoggerFactory.getLogger(SalesforceSyncController.class);

    @Autowired
    private SalesforceSyncService syncService;

    /**
     * Triggers a full sync of all MySQL records that have not yet been
     * assigned a Salesforce ID (salesforce_id IS NULL).
     *
     * @return JSON map summarising how many records of each type were synced
     */
    @PostMapping("/salesforce")
    public ResponseEntity<Map<String, Object>> triggerSync() {
        log.info("Manual Salesforce sync triggered via API");
        try {
            Map<String, Integer> summary = syncService.syncAll();
            Map<String, Object> response = Map.of(
                    "status", "success",
                    "synced", summary
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Salesforce sync error: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Returns sync status / health-check information.
     */
    @GetMapping("/salesforce/status")
    public ResponseEntity<Map<String, Object>> syncStatus() {
        return ResponseEntity.ok(Map.of(
                "service", "SalesforceSyncService",
                "status", "available",
                "description", "POST /api/sync/salesforce to push unsynced MySQL records to Salesforce"
        ));
    }
}
