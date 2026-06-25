import json
import urllib.request
import urllib.error
import random
import sys

BASE_URL = "http://localhost:8081/api"

def make_request(url, method="GET", data=None, token=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    
    body = None
    if data:
        body = json.dumps(data).encode("utf-8")
        
    try:
        with urllib.request.urlopen(req, data=body) as response:
            res_data = response.read()
            if response.getheader("Content-Type") == "application/pdf":
                return res_data, response.status
            return json.loads(res_data.decode("utf-8")), response.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err_body}")
        raise e

def run_verification():
    print("=== STARTING RECEIPT API VERIFICATION ===")
    
    # 1. Register new user
    rand_id = random.randint(1000, 9999)
    email = f"justin.test{rand_id}@example.com"
    mobile = "9876543210"
    
    user_payload = {
        "firstName": "Justin",
        "lastName": "Test",
        "email": email,
        "mobile": mobile,
        "password": "Password123"
    }
    
    print(f"\n1. Registering user: {email}...")
    res, status = make_request(f"{BASE_URL}/users", "POST", user_payload)
    print(f"User registration step 1 success: {res}")
    
    # Confirm registration with bypass OTP
    confirm_payload = {
        "email": email,
        "mobile": "+91" + mobile,
        "otp": "123456"
    }
    print("2. Confirming registration with OTP...")
    res, status = make_request(f"{BASE_URL}/users/register-confirm", "POST", confirm_payload)
    print(f"User registration confirmed: {res}")
    user_id = res["userId"]
    
    # 2. Login User
    login_payload = {
        "email": email,
        "password": "Password123"
    }
    print(f"\n3. Logging in: {email}...")
    res, status = make_request(f"{BASE_URL}/users/login", "POST", login_payload)
    print(f"Login step 1 success: {res}")
    
    # Verify login OTP to get JWT Token
    verify_payload = {
        "userId": user_id,
        "mobile": "+91" + mobile,
        "otp": "123456",
        "purpose": "LOGIN"
    }
    print("4. Verifying login OTP...")
    res, status = make_request(f"{BASE_URL}/otp/verify", "POST", verify_payload)
    print("Login OTP verified!")
    token = res["user"]["token"]
    print(f"JWT Token acquired: {token[:20]}...")
    
    # 3. Create Beneficiary
    bene_payload = {
        "name": "India Beneficiary Payee",
        "country": "India",
        "bankName": "State Bank of India",
        "accountNumber": "1234567890",
        "swiftBic": "SBIN0001234",
        "mobile": "9876543211",
        "status": "APPROVED",
        "user": { "id": user_id }
    }
    print("\n5. Creating Beneficiary Payee...")
    res, status = make_request(f"{BASE_URL}/beneficiaries", "POST", bene_payload, token)
    bene_id = res["beneficiary"]["id"]
    print(f"Beneficiary created! ID: {bene_id}")
    
    # 4. Create Transfer Request
    transfer_payload = {
        "user": { "id": user_id },
        "beneficiary": { "id": bene_id },
        "sourceCurrency": "USD",
        "destinationCurrency": "INR",
        "amount": 1000.0,
        "purpose": "Family Support",
        "exchangeRate": 83.5,
        "transferFee": 10.0,
        "receiverAmount": 83500.0,
        "status": "PENDING_OTP"
    }
    print("\n6. Creating Transfer Request...")
    res, status = make_request(f"{BASE_URL}/transfer-requests", "POST", transfer_payload, token)
    tr_id = res["id"]
    print(f"Transfer Request created! ID: {tr_id}")
    
    # Validate OTP for transfer
    tr_otp_payload = { "otp": "123456" }
    print("7. Validating Transfer Request OTP...")
    res, status = make_request(f"{BASE_URL}/transfer-requests/{tr_id}/otp/validate", "POST", tr_otp_payload, token)
    print(f"Transfer OTP validated: {res}")
    
    # 5. Capture Payment (Proceeds as simulated payment when signature is blank/null)
    payment_payload = {
        "transferRequest": { "id": tr_id },
        "orderId": f"order_test_{rand_id}",
        "paymentId": f"pay_test_{rand_id}",
        "signature": "",
        "amount": 1010.0,
        "status": "SUCCESS"
    }
    print("\n8. Submitting Capture Payment (triggers transaction, notification, and auto-receipt)...")
    res, status = make_request(f"{BASE_URL}/payments", "POST", payment_payload, token)
    print(f"Payment capture result: {res}")
    receipt_id = res.get("receiptId")
    assert receipt_id is not None, "Receipt ID was NOT generated in the response!"
    print(f"SUCCESS: Receipt auto-generated during payment! Receipt ID: {receipt_id}")
    
    # 6. Fetch Receipt Details
    print(f"\n9. Fetching Receipt details for ID: {receipt_id}...")
    res, status = make_request(f"{BASE_URL}/receipts/{receipt_id}", "GET", token=token)
    print("Receipt details successfully fetched:")
    print(f"  Receipt Number: {res.get('receiptNumber')}")
    print(f"  Transaction ID: {res.get('transactionId')}")
    print(f"  Razorpay Order ID: {res.get('orderId')}")
    print(f"  Razorpay Payment ID: {res.get('paymentId')}")
    print(f"  QR Code Base64 present: {res.get('qrCodeBase64') is not None} ({len(res.get('qrCodeBase64', ''))} chars)")
    print(f"  Receipt PDF URL: {res.get('receiptPdfUrl')}")
    
    # 7. Fetch Receipt List
    print(f"\n10. Fetching user Receipts list...")
    res, status = make_request(f"{BASE_URL}/receipts?userId={user_id}", "GET", token=token)
    print(f"Acquired receipts registry. Total items: {len(res)}")
    assert len(res) >= 1, "User receipts registry should contain at least 1 receipt!"
    
    # 8. Download PDF file bytes
    print(f"\n11. Downloading Receipt PDF stream...")
    pdf_bytes, status = make_request(f"{BASE_URL}/receipts/{receipt_id}/pdf", "GET", token=token)
    print(f"PDF download success! Status code: {status}")
    print(f"Downloaded PDF size: {len(pdf_bytes)} bytes")
    
    # Check PDF magic bytes (should start with '%PDF')
    assert pdf_bytes.startswith(b"%PDF"), "Downloaded file is not a valid PDF document!"
    print("SUCCESS: Valid PDF header matches '%PDF'!")
    
    print("\n=== RECEIPT SYSTEM INTEGRATION FULLY VERIFIED! ===")

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"Verification script failed: {e}")
        sys.exit(1)
