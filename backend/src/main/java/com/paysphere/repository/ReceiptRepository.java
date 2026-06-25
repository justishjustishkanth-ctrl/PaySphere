package com.paysphere.repository;

import com.paysphere.model.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    List<Receipt> findByUserId(Long userId);
    Optional<Receipt> findByTransactionId(Long transactionId);
    Optional<Receipt> findByReceiptNumber(String receiptNumber);
}
