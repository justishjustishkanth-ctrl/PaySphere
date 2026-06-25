package com.paysphere.config;

import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.paysphere.model.User;
import com.paysphere.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseAuthenticationFilter.class);

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String requestTokenHeader = request.getHeader("Authorization");

        if (requestTokenHeader != null && requestTokenHeader.startsWith("Bearer ")) {
            String token = requestTokenHeader.substring(7).trim();

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                // Determine if it is a mock Firebase token for testing
                boolean isMock = token.startsWith("mock-firebase-");

                try {
                    String email = null;
                    String uid = null;

                    if (isMock) {
                        // Mock token format: mock-firebase-[uid]-[email]
                        String[] parts = token.split("-");
                        if (parts.length >= 4) {
                            uid = parts[2];
                            email = parts[3];
                        } else {
                            uid = "mock-uid-default";
                            email = "mock-google-user@example.com";
                        }
                        log.debug("Firebase Auth (FILTER): Verifying mock token: email={}, uid={}", email, uid);
                    } else {
                        // Live Firebase Admin SDK validation
                        if (!FirebaseApp.getApps().isEmpty()) {
                            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                            email = decodedToken.getEmail();
                            uid = decodedToken.getUid();
                        }
                    }

                    if (email != null && uid != null) {
                        // Locate matching database user to determine role
                        Optional<User> userOpt = userRepository.findByEmail(email);
                        String role = "CUSTOMER";
                        if (userOpt.isPresent()) {
                            role = userOpt.get().getRole();
                        }

                        String authorityRole = "ROLE_" + role.toUpperCase();
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                email, null, Collections.singletonList(new SimpleGrantedAuthority(authorityRole)));
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        log.debug("Firebase Auth (FILTER): Authenticated successfully. email={}, role={}", email, role);
                    }
                } catch (Exception e) {
                    // Fall through gracefully. Let standard JwtAuthenticationFilter or standard Spring Security handle it
                    log.trace("Firebase Auth (FILTER): Parse failed (token might not be Firebase-issued): {}", e.getMessage());
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
