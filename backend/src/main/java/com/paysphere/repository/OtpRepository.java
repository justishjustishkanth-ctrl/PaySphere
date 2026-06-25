package com.paysphere.repository;

import com.paysphere.model.OtpEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OtpRepository extends JpaRepository<OtpEntity, Long> {

    /** Latest active (PENDING, not expired) OTP for a user+mobile+purpose. */
    Optional<OtpEntity> findTopByUserIdAndMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
            Long userId, String mobileNumber, String purpose, String status);

    /** All OTPs for a user+mobile+purpose (for rate-limit check). */
    List<OtpEntity> findByUserIdAndMobileNumberAndPurposeAndCreatedAtAfter(
            Long userId, String mobileNumber, String purpose, LocalDateTime since);

    /** Find latest PENDING OTP for a mobile+purpose regardless of userId (for login flow). */
    Optional<OtpEntity> findTopByMobileNumberAndPurposeAndStatusOrderByCreatedAtDesc(
            String mobileNumber, String purpose, String status);

    /** Count sends in a time window for rate limiting. */
    @Query("SELECT COUNT(o) FROM OtpEntity o WHERE o.mobileNumber = :mobile AND o.purpose = :purpose AND o.createdAt >= :since")
    long countByMobileAndPurposeSince(@Param("mobile") String mobile,
                                      @Param("purpose") String purpose,
                                      @Param("since") LocalDateTime since);
}
