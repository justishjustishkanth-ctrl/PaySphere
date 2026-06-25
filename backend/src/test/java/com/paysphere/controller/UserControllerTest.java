package com.paysphere.controller;

import com.paysphere.model.User;
import com.paysphere.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.paysphere.service.OtpService otpService;

    @Mock
    private com.paysphere.service.SmsService smsService;

    @Mock
    private com.paysphere.service.SalesforceSyncService sfSyncService;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private com.paysphere.util.JwtUtils jwtUtils;

    @InjectMocks
    private UserController userController;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testCreateUser_Success() throws Exception {
        User user = new User();
        user.setEmail("test@paysphere.com");
        user.setPassword("secret");
        user.setMobile("9876543210");

        when(passwordEncoder.encode(any(CharSequence.class))).thenReturn("encoded_secret");
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(user);
        when(otpService.generateAndSend(any(), any(), any())).thenReturn("some_hash");

        ResponseEntity<?> response = userController.createUser(user);
        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
    }

    @Test
    public void testCreateUser_DuplicateEmail() {
        User user = new User();
        user.setEmail("duplicate@paysphere.com");

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        ResponseEntity<?> response = userController.createUser(user);
        assertEquals(400, response.getStatusCode().value());
        assertEquals("Email already exists", response.getBody());
    }

    @Test
    public void testGoogleLogin_Success_NewUser() {
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("idToken", "mock-firebase-uid123-newuser@example.com-New User-http://image.url");

        when(userRepository.findByFirebaseUid("uid123")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newuser@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtils.generateToken("newuser@example.com", "CUSTOMER")).thenReturn("mock-jwt-token");

        ResponseEntity<?> response = userController.googleLogin(body);
        assertEquals(200, response.getStatusCode().value());
        
        java.util.Map<String, Object> respBody = (java.util.Map<String, Object>) response.getBody();
        assertNotNull(respBody);
        assertEquals("newuser@example.com", respBody.get("email"));
        assertEquals("mock-jwt-token", respBody.get("token"));
        assertEquals("New", respBody.get("firstName"));
        assertEquals("User", respBody.get("lastName"));
        assertEquals("GOOGLE", respBody.get("provider"));
    }

    @Test
    public void testGoogleLogin_Success_ExistingUser() {
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("idToken", "mock-firebase-uid123-existing@example.com-Existing User-http://image.url");

        User existingUser = new User();
        existingUser.setEmail("existing@example.com");
        existingUser.setRole("CUSTOMER");
        existingUser.setProvider("LOCAL");

        when(userRepository.findByFirebaseUid("uid123")).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtUtils.generateToken("existing@example.com", "CUSTOMER")).thenReturn("mock-jwt-token");

        ResponseEntity<?> response = userController.googleLogin(body);
        assertEquals(200, response.getStatusCode().value());

        java.util.Map<String, Object> respBody = (java.util.Map<String, Object>) response.getBody();
        assertNotNull(respBody);
        assertEquals("existing@example.com", respBody.get("email"));
        assertEquals("mock-jwt-token", respBody.get("token"));
        assertEquals("GOOGLE", respBody.get("provider"));
    }

    @Test
    public void testGoogleLogin_Failure_EmptyToken() {
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("idToken", "");

        ResponseEntity<?> response = userController.googleLogin(body);
        assertEquals(400, response.getStatusCode().value());
        assertEquals("idToken is required", response.getBody());
    }
}

