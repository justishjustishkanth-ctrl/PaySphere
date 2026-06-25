package com.paysphere.controller;

import com.paysphere.model.ExchangeRate;
import com.paysphere.repository.ExchangeRateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/exchange-rates")
@CrossOrigin(origins = "*")
public class ExchangeRateController {

    @Autowired
    private ExchangeRateRepository exchangeRateRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> getExchangeRate(@RequestParam String source, @RequestParam String destination) {
        // Try to fetch latest from DB first to optimize API calls
        Optional<ExchangeRate> rateOpt = exchangeRateRepository
                .findTopBySourceCurrencyAndDestinationCurrencyOrderByTimestampDesc(source, destination);

        if (rateOpt.isPresent()) {
            return ResponseEntity.ok(rateOpt.get());
        }

        // Otherwise call a mock/free public API
        double rateValue = 1.0;
        try {
            String url = "https://open.er-api.com/v6/latest/" + source.toUpperCase();
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("rates")) {
                Map<String, Object> rates = (Map<String, Object>) response.get("rates");
                if (rates.containsKey(destination.toUpperCase())) {
                    rateValue = Double.parseDouble(rates.get(destination.toUpperCase()).toString());
                }
            }
        } catch (Exception e) {
            // Fallback default mock rates
            rateValue = getDefaultRate(source, destination);
        }

        ExchangeRate rateRecord = new ExchangeRate();
        rateRecord.setSourceCurrency(source.toUpperCase());
        rateRecord.setDestinationCurrency(destination.toUpperCase());
        rateRecord.setRate(rateValue);
        exchangeRateRepository.save(rateRecord);

        return ResponseEntity.ok(rateRecord);
    }

    private double getDefaultRate(String source, String dest) {
        if ("USD".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 83.5;
        if ("INR".equalsIgnoreCase(source) && "USD".equalsIgnoreCase(dest)) return 0.012;
        if ("EUR".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 90.2;
        if ("GBP".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 106.1;
        if ("AED".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 22.7;
        if ("SGD".equalsIgnoreCase(source) && "INR".equalsIgnoreCase(dest)) return 61.8;
        return 1.0;
    }
}
