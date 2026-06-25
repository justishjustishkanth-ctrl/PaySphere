-- PaySphere MySQL Database Schema

CREATE DATABASE IF NOT EXISTS paysphere_db;
USE paysphere_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    password VARCHAR(255) NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    firebase_uid VARCHAR(255) UNIQUE,
    full_name VARCHAR(255),
    profile_picture VARCHAR(512),
    provider VARCHAR(50) DEFAULT 'LOCAL',
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. KYC Verification Table
CREATE TABLE IF NOT EXISTS kyc (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    pan VARCHAR(50),
    aadhaar VARCHAR(50),
    passport VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'PENDING',
    document_url VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Beneficiaries Table
CREATE TABLE IF NOT EXISTS beneficiaries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    country VARCHAR(100),
    bank_name VARCHAR(150),
    account_number VARCHAR(100) NOT NULL,
    swift_bic VARCHAR(50),
    mobile VARCHAR(20),
    status VARCHAR(50) DEFAULT 'PENDING',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Exchange Rates Table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_currency VARCHAR(10) NOT NULL,
    destination_currency VARCHAR(10) NOT NULL,
    rate DOUBLE NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transfer Requests Table
CREATE TABLE IF NOT EXISTS transfer_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    beneficiary_id BIGINT NOT NULL,
    source_currency VARCHAR(10) NOT NULL,
    destination_currency VARCHAR(10) NOT NULL,
    amount DOUBLE NOT NULL,
    purpose TEXT,
    exchange_rate DOUBLE NOT NULL,
    transfer_fee DOUBLE NOT NULL,
    receiver_amount DOUBLE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT',
    otp VARCHAR(10),
    otp_generated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id) ON DELETE CASCADE
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transfer_request_id BIGINT NOT NULL,
    order_id VARCHAR(100),
    payment_id VARCHAR(100),
    signature VARCHAR(255),
    amount DOUBLE NOT NULL,
    status VARCHAR(50),
    FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE CASCADE
);

-- 7. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    transfer_request_id BIGINT,
    payment_id BIGINT,
    amount DOUBLE NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- 8. Transfer Approvals Table
CREATE TABLE IF NOT EXISTS transfer_approvals (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    transfer_request_id BIGINT NOT NULL,
    approver VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING_APPROVAL',
    comments TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_request_id) REFERENCES transfer_requests(id) ON DELETE CASCADE
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Fraud Logs Table
CREATE TABLE IF NOT EXISTS fraud_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    details TEXT,
    flag_reason VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    username VARCHAR(150),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 12. Webhook Logs Table
CREATE TABLE IF NOT EXISTS webhook_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100),
    payload TEXT,
    processed BOOLEAN DEFAULT FALSE,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 13. OTP Records Table (encrypted OTP storage)
CREATE TABLE IF NOT EXISTS otp_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    mobile_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(512) NOT NULL,       -- AES-256 encrypted, Base64-encoded
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    purpose VARCHAR(50) NOT NULL,          -- REGISTER|LOGIN|TRANSFER|BENEFICIARY|PASSWORD_RESET
    status VARCHAR(20) DEFAULT 'PENDING',   -- PENDING|VERIFIED|EXPIRED|LOCKED
    message_sid VARCHAR(100)                -- Twilio Message SID for delivery tracking
);

-- Index for fast lookup by mobile + purpose + status
CREATE INDEX IF NOT EXISTS idx_otp_mobile_purpose ON otp_records (mobile_number, purpose, status);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_records (user_id, purpose, status);

-- 14. OTP Audit Logs Table
CREATE TABLE IF NOT EXISTS otp_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    mobile_number VARCHAR(20),
    action VARCHAR(30) NOT NULL,           -- SENT|VERIFIED|FAILED|EXPIRED|LOCKED|RESENT
    purpose VARCHAR(50),
    details VARCHAR(500),
    timestamp DATETIME NOT NULL,
    salesforce_id VARCHAR(50)              -- OTP_Log__c record ID after SF sync
);

-- 15. Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(100) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    transaction_id BIGINT NOT NULL,
    payment_id BIGINT NOT NULL,
    receipt_pdf_url VARCHAR(255),
    created_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Indexes for performance optimization (user_id, transaction_id, beneficiary_id, receipt_id, payment_id)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc (user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON beneficiaries (user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_user_id ON transfer_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_beneficiary_id ON transfer_requests (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_payments_transfer_request_id ON payments (transfer_request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_request_id ON transactions (transfer_request_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON transactions (payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON fraud_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts (transaction_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts (payment_id);
