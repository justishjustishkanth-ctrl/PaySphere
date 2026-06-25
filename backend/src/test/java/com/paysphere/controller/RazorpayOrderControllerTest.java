package com.paysphere.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class RazorpayOrderControllerTest {

    private RazorpayOrderController controller;

    @BeforeEach
    public void setup() {
        controller = new RazorpayOrderController();
        ReflectionTestUtils.setField(controller, "razorpayKeyId", "rzp_test_T3RxjyVWed9uHv");
        ReflectionTestUtils.setField(controller, "razorpayKeySecret", "p7EnbDukw2gX4cswiDGFA5J6");
    }

    @Test
    public void testCreateOrder_MissingAmount() {
        Map<String, Object> body = new HashMap<>();
        body.put("currency", "INR");

        ResponseEntity<?> response = controller.createOrder(body);
        assertEquals(400, response.getStatusCode().value());
        
        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        assertNotNull(responseBody);
        assertEquals("Invalid amount", responseBody.get("error"));
    }

    @Test
    public void testCreateOrder_NegativeAmount() {
        Map<String, Object> body = new HashMap<>();
        body.put("amount", -100);
        body.put("currency", "INR");

        ResponseEntity<?> response = controller.createOrder(body);
        assertEquals(400, response.getStatusCode().value());

        Map<?, ?> responseBody = (Map<?, ?>) response.getBody();
        assertNotNull(responseBody);
        assertEquals("Invalid amount", responseBody.get("error"));
    }
}
