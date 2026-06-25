package com.paysphere.controller;

import com.paysphere.model.Notification;
import com.paysphere.model.User;
import com.paysphere.repository.NotificationRepository;
import com.paysphere.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.paysphere.service.SalesforceSyncService syncService;

    @PostMapping
    public ResponseEntity<?> createNotification(@RequestBody Notification notification) {
        Optional<User> userOpt = userRepository.findById(notification.getUser().getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        notification.setUser(userOpt.get());
        Notification saved = notificationRepository.save(notification);
        try {
            syncService.syncNotification(saved);
        } catch (Exception e) {
            // non-fatal
        }
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public List<Notification> getNotifications(@RequestParam Long userId, @RequestParam(required = false) Boolean unreadOnly) {
        if (unreadOnly != null && unreadOnly) {
            return notificationRepository.findByUserIdAndIsReadOrderByTimestampDesc(userId, false);
        }
        return notificationRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        return notificationRepository.findById(id)
                .map(notification -> {
                    notification.setRead(true);
                    return ResponseEntity.ok(notificationRepository.save(notification));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
