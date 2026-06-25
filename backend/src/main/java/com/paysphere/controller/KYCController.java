package com.paysphere.controller;

import com.paysphere.model.KYC;
import com.paysphere.model.User;
import com.paysphere.repository.KYCRepository;
import com.paysphere.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/kyc")
@CrossOrigin(origins = "*")
public class KYCController {

    @Autowired
    private KYCRepository kycRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> submitKYC(@RequestBody KYC kyc) {
        Optional<User> userOpt = userRepository.findById(kyc.getUser().getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        kyc.setUser(userOpt.get());
        KYC savedKyc = kycRepository.save(kyc);
        return ResponseEntity.ok(savedKyc);
    }

    @GetMapping
    public List<KYC> getAllKYC(@RequestParam(required = false) String status) {
        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (isAdmin) {
            if (status != null) {
                return kycRepository.findByStatus(status);
            }
            return kycRepository.findAll();
        } else if (auth != null) {
            // Non-admin can only see their own KYC details
            String email = auth.getName();
            Optional<User> currentUserOpt = userRepository.findByEmail(email);
            if (currentUserOpt.isPresent()) {
                Long currentUserId = currentUserOpt.get().getId();
                return kycRepository.findAll().stream()
                        .filter(k -> k.getUser() != null && k.getUser().getId().equals(currentUserId))
                        .filter(k -> status == null || status.equalsIgnoreCase(k.getStatus()))
                        .collect(java.util.stream.Collectors.toList());
            }
        }
        return java.util.Collections.emptyList();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        return kycRepository.findById(id)
                .map(kyc -> {
                    kyc.setStatus(status);
                    return ResponseEntity.ok(kycRepository.save(kyc));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
