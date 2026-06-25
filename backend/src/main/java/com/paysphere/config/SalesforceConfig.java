package com.paysphere.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Holds Salesforce connection configuration read from application.properties.
 * The alias is used to invoke the Salesforce CLI for dynamic token retrieval.
 */
@Configuration
public class SalesforceConfig {

    @Value("${salesforce.alias}")
    private String alias;

    @Value("${salesforce.instance-url}")
    private String instanceUrl;

    @Value("${salesforce.api-version}")
    private String apiVersion;

    public String getAlias() {
        return alias;
    }

    public String getInstanceUrl() {
        return instanceUrl;
    }

    public String getApiVersion() {
        return apiVersion;
    }
}
