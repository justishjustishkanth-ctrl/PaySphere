package com.paysphere.controller;

import com.paysphere.model.Transaction;
import com.paysphere.model.User;
import com.paysphere.repository.TransactionRepository;
import com.paysphere.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/transactions")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> createTransaction(@RequestBody Transaction transaction) {
        Optional<User> userOpt = userRepository.findById(transaction.getUser().getId());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }
        transaction.setUser(userOpt.get());
        return ResponseEntity.ok(transactionRepository.save(transaction));
    }

    @GetMapping
    public List<Transaction> getTransactions(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return transactionRepository.findByUserId(userId);
        }
        return transactionRepository.findAll();
    }
}
