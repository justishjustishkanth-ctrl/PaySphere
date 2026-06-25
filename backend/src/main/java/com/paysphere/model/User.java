package com.paysphere.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(unique = true, nullable = false)
    private String email;

    private String mobile;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;

    @Column(name = "failed_attempts")
    private int failedAttempts = 0;

    private boolean locked = false;
    private String role = "CUSTOMER";

    @JsonIgnore
    @Column(name = "salesforce_id")
    private String salesforceId;

    @Column(name = "firebase_uid", unique = true)
    private String firebaseUid;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "profile_picture")
    private String profilePicture;

    private String provider = "LOCAL";

    @Column(name = "last_login")
    private java.time.LocalDateTime lastLogin;

    @Column(name = "created_at")
    private java.time.LocalDateTime createdAt = java.time.LocalDateTime.now();
}
