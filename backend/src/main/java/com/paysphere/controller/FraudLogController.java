package com.paysphere.controller;

import com.paysphere.model.FraudLog;
import com.paysphere.model.User;
import com.paysphere.repository.FraudLogRepository;
import com.paysphere.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/fraud-logs")
@CrossOrigin(origins = "*")
public class FraudLogController {

    @Autowired
    private FraudLogRepository fraudLogRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> createFraudLog(@RequestBody FraudLog log) {
        if (log.getUser() != null && log.getUser().getId() != null) {
            Optional<User> userOpt = userRepository.findById(log.getUser().getId());
            if (userOpt.isPresent()) {
                log.setUser(userOpt.get());
            }
        }
        return ResponseEntity.ok(fraudLogRepository.save(log));
    }

    @GetMapping
    public List<FraudLog> getFraudLogs(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return fraudLogRepository.findByUserId(userId);
        }
        return fraudLogRepository.findAll();
    }
}
