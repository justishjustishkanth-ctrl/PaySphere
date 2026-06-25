package com.paysphere.repository;

import com.paysphere.model.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {
    Optional<ExchangeRate> findTopBySourceCurrencyAndDestinationCurrencyOrderByTimestampDesc(String source, String dest);
}
