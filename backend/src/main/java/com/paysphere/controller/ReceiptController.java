package com.paysphere.controller;

import com.paysphere.model.*;
import com.paysphere.repository.*;
import com.paysphere.service.ReceiptService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/receipts")
@CrossOrigin(origins = "*")
public class ReceiptController {
    
    private static final Logger log = LoggerFactory.getLogger(ReceiptController.class);

    @Autowired
    private ReceiptRepository receiptRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private ReceiptService receiptService;

    @GetMapping
    public List<Receipt> getReceipts(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return receiptRepository.findByUserId(userId);
        }
        return receiptRepository.findAll();
    }

    @GetMapping("/recent")
    public List<Receipt> getRecentReceipts(@RequestParam(required = false) Long userId) {
        List<Receipt> list;
        if (userId != null) {
            list = receiptRepository.findByUserId(userId);
        } else {
            list = receiptRepository.findAll();
        }
        list.sort((r1, r2) -> r2.getCreatedTimestamp().compareTo(r1.getCreatedTimestamp()));
        return list.stream().limit(5).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getReceiptById(@PathVariable Long id) {
        Optional<Receipt> receiptOpt = receiptRepository.findById(id);
        if (receiptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Receipt receipt = receiptOpt.get();
        try {
            String qrBase64 = receiptService.generateQrCodeBase64(receipt);
            
            Map<String, Object> map = new HashMap<>();
            map.put("id", receipt.getId());
            map.put("receiptNumber", receipt.getReceiptNumber());
            map.put("userId", receipt.getUser().getId());
            map.put("firstName", receipt.getUser().getFirstName());
            map.put("lastName", receipt.getUser().getLastName());
            map.put("email", receipt.getUser().getEmail());
            map.put("mobile", receipt.getUser().getMobile());
            map.put("transactionId", receipt.getTransaction().getId());
            map.put("paymentId", receipt.getPayment().getPaymentId());
            map.put("orderId", receipt.getPayment().getOrderId());
            map.put("transferRequestId", receipt.getTransaction().getTransferRequest().getId());
            map.put("beneficiaryName", receipt.getTransaction().getTransferRequest().getBeneficiary().getName());
            map.put("amountSent", receipt.getTransaction().getTransferRequest().getAmount());
            map.put("exchangeRate", receipt.getTransaction().getTransferRequest().getExchangeRate());
            map.put("currencySent", receipt.getTransaction().getTransferRequest().getSourceCurrency());
            map.put("currencyReceived", receipt.getTransaction().getTransferRequest().getDestinationCurrency());
            map.put("transactionFee", receipt.getTransaction().getTransferRequest().getTransferFee());
            map.put("totalAmountPaid", receipt.getPayment().getAmount());
            map.put("paymentMethod", "Razorpay (Online)");
            map.put("createdTimestamp", receipt.getCreatedTimestamp());
            map.put("status", receipt.getTransaction().getStatus());
            map.put("qrCodeBase64", qrBase64);
            map.put("receiptPdfUrl", receipt.getReceiptPdfUrl());

            return ResponseEntity.ok(map);
        } catch (Exception e) {
            log.error("Error generating QR code for receipt ID: " + id, e);
            return ResponseEntity.status(500).body("Error retrieving receipt details: " + e.getMessage());
        }
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> getReceiptPdf(@PathVariable Long id) {
        Optional<Receipt> receiptOpt = receiptRepository.findById(id);
        if (receiptOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Receipt receipt = receiptOpt.get();
        try {
            byte[] pdfBytes = receiptService.getPdfFileBytes(receipt);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            // Stream inline as PDF file
            headers.add(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=receipt-" + receipt.getReceiptNumber() + ".pdf");
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
            
            return ResponseEntity.ok().headers(headers).body(pdfBytes);
        } catch (Exception e) {
            log.error("Error reading PDF file for receipt ID: " + id, e);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generateReceipt(@RequestBody Map<String, Long> payload) {
        Long txId = payload.get("transactionId");
        if (txId == null) {
            return ResponseEntity.badRequest().body("Transaction ID is required");
        }

        Optional<Transaction> txOpt = transactionRepository.findById(txId);
        if (txOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Transaction not found");
        }

        Transaction tx = txOpt.get();
        if (!"SUCCESS".equalsIgnoreCase(tx.getStatus()) && !"COMPLETED".equalsIgnoreCase(tx.getStatus())) {
            return ResponseEntity.badRequest().body("Receipts can only be generated for successful transactions");
        }

        try {
            Receipt receipt = receiptService.generateReceipt(tx);
            return ResponseEntity.ok(receipt);
        } catch (Exception e) {
            log.error("Failed to generate receipt for transaction " + txId, e);
            return ResponseEntity.status(500).body("Receipt generation failed: " + e.getMessage());
        }
    }
}
