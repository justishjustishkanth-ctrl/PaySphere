public with sharing class ExchangeRateController {
    public Decimal getRate(String source, String destination) {
        // Return conversion rate directly
        if (source == destination) return 1.0;
        if ('USD'.equals(source) && 'INR'.equals(destination)) return 83.5;
        if ('INR'.equals(source) && 'USD'.equals(destination)) return 0.012;
        return 1.0;
    }
}
