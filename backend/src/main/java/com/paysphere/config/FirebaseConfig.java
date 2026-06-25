package com.paysphere.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {
    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    @Value("${firebase.config.path:classpath:service-account.json}")
    private Resource firebaseConfigFile;

    @PostConstruct
    public void init() {
        try {
            if (firebaseConfigFile == null || !firebaseConfigFile.exists()) {
                log.warn("====================================================");
                log.warn("FIREBASE ADMIN SDK INITIALIZATION WARNING");
                log.warn("Firebase configuration file 'service-account.json' not found.");
                log.warn("Please place your Firebase service account private key JSON file");
                log.warn("in the folder: backend/src/main/resources/service-account.json");
                log.warn("Or configure 'firebase.config.path' in application.properties");
                log.warn("Gracefully falling back to developer mock verification mode.");
                log.warn("====================================================");
                return;
            }

            log.info("Firebase Config: Loading credentials from resource: {}", firebaseConfigFile.getURI());
            try (InputStream serviceAccount = firebaseConfigFile.getInputStream()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                if (FirebaseApp.getApps().isEmpty()) {
                    FirebaseApp.initializeApp(options);
                    log.info("Firebase Config: Firebase Admin SDK initialized successfully.");
                } else {
                    log.info("Firebase Config: Firebase App already initialized.");
                }
            }
        } catch (IOException e) {
            log.error("Firebase Config: Failed to read Firebase Admin SDK credentials: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Firebase Config: Unexpected error during Firebase Admin SDK initialization: {}", e.getMessage());
        }
    }
}

