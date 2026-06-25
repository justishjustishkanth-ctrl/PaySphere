package com.paysphere.config;

import com.paysphere.model.User;
import com.paysphere.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class AdminUserInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserInitializer.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        String adminEmail = "justishjustishkanth@gmail.com";
        Optional<User> userOpt = userRepository.findByEmail(adminEmail);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (!"ADMIN".equals(user.getRole())) {
                user.setRole("ADMIN");
                userRepository.save(user);
                log.info("Existing user {} role updated to ADMIN at startup", adminEmail);
            } else {
                log.info("Admin user {} already exists with ADMIN role", adminEmail);
            }
        } else {
            User admin = new User();
            admin.setEmail(adminEmail);
            admin.setFirstName("Justish");
            admin.setLastName("Kanth");
            admin.setFullName("Justish Kanth");
            admin.setMobile("+918754758789");
            admin.setPassword(passwordEncoder.encode("Admin@123")); // Default password
            admin.setRole("ADMIN");
            admin.setLocked(false);
            userRepository.save(admin);
            log.info("Created new admin user {} with role ADMIN at startup", adminEmail);
        }
    }
}
