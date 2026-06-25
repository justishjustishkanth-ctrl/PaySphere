package com.paysphere.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paysphere.config.SalesforceConfig;
import com.paysphere.service.SalesforceAuthService;
import com.paysphere.service.SalesforceAuthService.SalesforceCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Low-level Salesforce REST API client.
 * Supports creating and updating sObject records via the Salesforce Data API.
 */
@Component
public class SalesforceClient {

    private static final Logger log = LoggerFactory.getLogger(SalesforceClient.class);

    @Autowired
    private SalesforceAuthService authService;

    @Autowired
    private SalesforceConfig salesforceConfig;

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Creates a new record in Salesforce for the given sObject type.
     *
     * @param sObjectType Salesforce API name (e.g. "Customer__c")
     * @param fields      Map of field API names to values
     * @return the Salesforce record ID of the newly created record
     */
    public String createRecord(String sObjectType, Map<String, Object> fields) {
        try {
            SalesforceCredentials creds = authService.getCredentials();
            String endpoint = creds.getInstanceUrl()
                    + "/services/data/" + salesforceConfig.getApiVersion()
                    + "/sobjects/" + sObjectType;

            String body = mapper.writeValueAsString(fields);
            log.info("SF CREATE {} → {}", sObjectType, body);

            HttpURLConnection conn = openConnection(endpoint, "POST", creds.getAccessToken());
            writeBody(conn, body);

            int status = conn.getResponseCode();
            String response = new String(conn.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            conn.disconnect();

            if (status == 201) {
                JsonNode node = mapper.readTree(response);
                String sfId = node.path("id").asText();
                log.info("SF created {} with ID: {}", sObjectType, sfId);
                return sfId;
            } else {
                log.error("SF create failed [{}]: {}", status, response);
                throw new RuntimeException("Salesforce create failed with HTTP " + status + ": " + response);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error creating Salesforce record: " + e.getMessage(), e);
        }
    }

    /**
     * Updates an existing Salesforce record using PATCH.
     *
     * @param sObjectType Salesforce API name
     * @param sfId        Salesforce record ID (18-char)
     * @param fields      Map of field API names to updated values
     */
    public void updateRecord(String sObjectType, String sfId, Map<String, Object> fields) {
        try {
            SalesforceCredentials creds = authService.getCredentials();
            String endpoint = creds.getInstanceUrl()
                    + "/services/data/" + salesforceConfig.getApiVersion()
                    + "/sobjects/" + sObjectType + "/" + sfId;

            String body = mapper.writeValueAsString(fields);
            log.info("SF PATCH {} {} → {}", sObjectType, sfId, body);

            HttpURLConnection conn = openConnection(endpoint, "PATCH", creds.getAccessToken());
            writeBody(conn, body);

            int status = conn.getResponseCode();
            conn.disconnect();

            if (status == 204) {
                log.info("SF updated {} [{}]", sObjectType, sfId);
            } else {
                log.error("SF update failed [{}]", status);
                throw new RuntimeException("Salesforce update failed with HTTP " + status);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error updating Salesforce record: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves a single Salesforce record by ID.
     *
     * @param sObjectType Salesforce API name
     * @param sfId        Salesforce record ID
     * @return Parsed JSON node of the record
     */
    public JsonNode getRecord(String sObjectType, String sfId) {
        try {
            SalesforceCredentials creds = authService.getCredentials();
            String endpoint = creds.getInstanceUrl()
                    + "/services/data/" + salesforceConfig.getApiVersion()
                    + "/sobjects/" + sObjectType + "/" + sfId;

            HttpURLConnection conn = openConnection(endpoint, "GET", creds.getAccessToken());
            int status = conn.getResponseCode();
            String response = new String(conn.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            conn.disconnect();

            if (status == 200) {
                return mapper.readTree(response);
            } else {
                throw new RuntimeException("Salesforce GET failed with HTTP " + status);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Error fetching Salesforce record: " + e.getMessage(), e);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private HttpURLConnection openConnection(String endpoint, String method, String token) throws Exception {
        URL url = new URL(endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        // HttpURLConnection doesn't natively support PATCH.
        // Use reflection to allow it, which is the standard Java workaround.
        if (method.equals("PATCH")) {
            conn.setRequestMethod("POST");
            try {
                java.lang.reflect.Field methodField = HttpURLConnection.class.getDeclaredField("method");
                methodField.setAccessible(true);
                methodField.set(conn, "PATCH");
            } catch (Exception e) {
                // Fallback: use X-HTTP-Method-Override (less reliable with Salesforce)
                log.warn("Reflection PATCH override failed, falling back to X-HTTP-Method-Override", e);
                conn.setRequestProperty("X-HTTP-Method-Override", "PATCH");
            }
        } else {
            conn.setRequestMethod(method);
        }

        conn.setRequestProperty("Authorization", "Bearer " + token);
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setRequestProperty("Accept", "application/json");
        conn.setDoOutput(!method.equals("GET"));
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(15_000);
        return conn;
    }

    private void writeBody(HttpURLConnection conn, String body) throws Exception {
        try (OutputStream os = conn.getOutputStream()) {
            os.write(body.getBytes(StandardCharsets.UTF_8));
        }
    }
}
