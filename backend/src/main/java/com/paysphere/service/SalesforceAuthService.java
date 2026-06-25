package com.paysphere.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.paysphere.config.SalesforceConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.stream.Collectors;

/**
 * Retrieves Salesforce authentication credentials dynamically by invoking
 * the Salesforce CLI command: sf org display --json -o <alias>
 * This approach avoids storing tokens in config files and gracefully
 * handles session expiry by always fetching a fresh token.
 */
@Service
public class SalesforceAuthService {

    private static final Logger log = LoggerFactory.getLogger(SalesforceAuthService.class);

    @Autowired
    private SalesforceConfig salesforceConfig;

    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Runs `sf org display --json -o <alias>` and parses the accessToken
     * and instanceUrl from the JSON output.
     *
     * @return SalesforceCredentials holding accessToken and instanceUrl
     * @throws RuntimeException if the CLI call fails or returns no token
     */
    public SalesforceCredentials getCredentials() {
        try {
            String sfCommand = "sf";
            java.io.File sfFile = new java.io.File("C:\\Program Files\\sf\\bin\\sf.cmd");
            if (sfFile.exists()) {
                sfCommand = sfFile.getAbsolutePath();
            }
            ProcessBuilder pb = new ProcessBuilder(
                    sfCommand, "org", "display", "--json", "-o", salesforceConfig.getAlias()
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            String output;
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                output = reader.lines().collect(Collectors.joining("\n"));
            }

            int exitCode = process.waitFor();
            log.debug("sf org display exit code: {}, output length: {}", exitCode, output.length());

            int jsonStartIndex = output.indexOf('{');
            if (jsonStartIndex == -1) {
                log.warn("SF CLI returned no JSON start. Output: {}", output);
                throw new RuntimeException("Salesforce CLI output was not JSON. Output: " + output);
            }
            String jsonOutput = output.substring(jsonStartIndex);

            JsonNode root = mapper.readTree(jsonOutput);
            JsonNode result = root.path("result");

            String accessToken = result.path("accessToken").asText(null);
            String instanceUrl = result.path("instanceUrl").asText(salesforceConfig.getInstanceUrl());

            if (accessToken == null || accessToken.isBlank()) {
                log.warn("SF CLI returned no accessToken. Output: {}", output);
                throw new RuntimeException("Salesforce accessToken not available. Run: sf org login web -a " + salesforceConfig.getAlias());
            }

            log.info("Salesforce credentials obtained for org: {}", salesforceConfig.getAlias());
            return new SalesforceCredentials(accessToken, instanceUrl);

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve Salesforce credentials via CLI: " + e.getMessage(), e);
        }
    }

    /**
     * Simple value holder for Salesforce access token and instance URL.
     */
    public static class SalesforceCredentials {
        private final String accessToken;
        private final String instanceUrl;

        public SalesforceCredentials(String accessToken, String instanceUrl) {
            this.accessToken = accessToken;
            this.instanceUrl = instanceUrl;
        }

        public String getAccessToken() { return accessToken; }
        public String getInstanceUrl() { return instanceUrl; }
    }
}
