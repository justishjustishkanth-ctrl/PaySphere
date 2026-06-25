package com.paysphere.config;

import com.paysphere.model.User;
import com.paysphere.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class FirebaseAuthenticationFilterTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @InjectMocks
    private FirebaseAuthenticationFilter firebaseAuthenticationFilter;

    @BeforeEach
    public void setup() {
        MockitoAnnotations.openMocks(this);
        SecurityContextHolder.clearContext();
    }

    @Test
    public void testDoFilterInternal_NoAuthorizationHeader() throws Exception {
        when(request.getHeader("Authorization")).thenReturn(null);

        firebaseAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    public void testDoFilterInternal_InvalidHeaderFormat() throws Exception {
        when(request.getHeader("Authorization")).thenReturn("InvalidToken abc");

        firebaseAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    public void testDoFilterInternal_MockToken_Success() throws Exception {
        String token = "Bearer mock-firebase-12345-testuser@paysphere.com-Test User";
        when(request.getHeader("Authorization")).thenReturn(token);

        User user = new User();
        user.setEmail("testuser@paysphere.com");
        user.setRole("CUSTOMER");
        when(userRepository.findByEmail("testuser@paysphere.com")).thenReturn(Optional.of(user));

        firebaseAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("testuser@paysphere.com", auth.getName());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER")));
    }

    @Test
    public void testDoFilterInternal_MockToken_UserNotFoundDefaultsToCustomer() throws Exception {
        String token = "Bearer mock-firebase-12345-testuser@paysphere.com-Test User";
        when(request.getHeader("Authorization")).thenReturn(token);
        when(userRepository.findByEmail("testuser@paysphere.com")).thenReturn(Optional.empty());

        firebaseAuthenticationFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertNotNull(auth);
        assertEquals("testuser@paysphere.com", auth.getName());
        assertTrue(auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CUSTOMER")));
    }
}
