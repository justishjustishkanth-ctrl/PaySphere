package com.paysphere.controller;

import com.paysphere.model.*;
import com.paysphere.repository.*;
import com.paysphere.service.ReceiptService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ReceiptControllerTest {

    @Mock
    private ReceiptRepository receiptRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private ReceiptService receiptService;

    @InjectMocks
    private ReceiptController receiptController;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testGetReceipts_Success() {
        Receipt receipt = new Receipt();
        receipt.setId(1L);
        receipt.setReceiptNumber("REC-20260620-ABCDEF");

        when(receiptRepository.findByUserId(1L)).thenReturn(Collections.singletonList(receipt));

        List<Receipt> result = receiptController.getReceipts(1L);
        assertEquals(1, result.size());
        assertEquals("REC-20260620-ABCDEF", result.get(0).getReceiptNumber());
    }

    @Test
    public void testGetReceiptById_NotFound() {
        when(receiptRepository.findById(99L)).thenReturn(Optional.empty());

        ResponseEntity<?> response = receiptController.getReceiptById(99L);
        assertEquals(404, response.getStatusCode().value());
    }

    @Test
    public void testGetReceiptById_Success() throws Exception {
        User user = new User();
        user.setId(1L);
        user.setFirstName("John");
        user.setLastName("Doe");
        user.setEmail("john.doe@example.com");

        Payment payment = new Payment();
        payment.setPaymentId("pay_123");
        payment.setOrderId("order_123");
        payment.setAmount(1010.0);

        TransferRequest tr = new TransferRequest();
        tr.setId(1L);
        tr.setBeneficiary(new Beneficiary());
        tr.getBeneficiary().setName("Jane Doe");
        tr.setAmount(1000.0);
        tr.setTransferFee(10.0);
        tr.setSourceCurrency("USD");
        tr.setDestinationCurrency("INR");
        tr.setExchangeRate(83.5);
        tr.setReceiverAmount(83500.0);

        Transaction transaction = new Transaction();
        transaction.setId(1L);
        transaction.setUser(user);
        transaction.setPayment(payment);
        transaction.setTransferRequest(tr);
        transaction.setStatus("SUCCESS");

        Receipt receipt = new Receipt();
        receipt.setId(1L);
        receipt.setReceiptNumber("REC-20260620-ABCDEF");
        receipt.setUser(user);
        receipt.setTransaction(transaction);
        receipt.setPayment(payment);
        receipt.setCreatedTimestamp(LocalDateTime.now());

        when(receiptRepository.findById(1L)).thenReturn(Optional.of(receipt));
        when(receiptService.generateQrCodeBase64(receipt)).thenReturn("MOCK_QR_BASE64");

        ResponseEntity<?> response = receiptController.getReceiptById(1L);
        assertEquals(200, response.getStatusCode().value());
        
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertNotNull(body);
        assertEquals("REC-20260620-ABCDEF", body.get("receiptNumber"));
        assertEquals("MOCK_QR_BASE64", body.get("qrCodeBase64"));
        assertEquals("John", body.get("firstName"));
    }

    @Test
    public void testGenerateReceipt_Success() throws Exception {
        Transaction tx = new Transaction();
        tx.setId(5L);
        tx.setStatus("SUCCESS");

        Receipt receipt = new Receipt();
        receipt.setId(10L);
        receipt.setReceiptNumber("REC-20260620-999");

        when(transactionRepository.findById(5L)).thenReturn(Optional.of(tx));
        when(receiptService.generateReceipt(tx)).thenReturn(receipt);

        Map<String, Long> payload = new HashMap<>();
        payload.put("transactionId", 5L);

        ResponseEntity<?> response = receiptController.generateReceipt(payload);
        assertEquals(200, response.getStatusCode().value());
        
        Receipt result = (Receipt) response.getBody();
        assertNotNull(result);
        assertEquals("REC-20260620-999", result.getReceiptNumber());
    }
}
