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
            return json.loads(res_data.decode("utf-8")), response.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {err_body}")
        raise e

def run_verification():
    print("=== STARTING FIREBASE AUTH INTEGRATION VERIFICATION ===")
    
    # 1. Generate a random UID and email for testing (ensuring NO hyphens in the uid or photo_url)
    rand_id = random.randint(1000, 9999)
    firebase_uid = f"uid{rand_id}"
    email = f"firebase.user{rand_id}@example.com"
    name = "Firebase Google Test User"
    photo_url = f"https://lh3.googleusercontent.com/photoUrl{rand_id}"
    
    # Format of mock token: mock-firebase-[uid]-[email]-[name]-[photo]
    mock_id_token = f"mock-firebase-{firebase_uid}-{email}-{name}-{photo_url}"
    
    # 2. Call google-login endpoint
    print(f"\n1. Calling POST /users/google-login with mock token for user: {email}...")
    payload = { "idToken": mock_id_token }
    res, status = make_request(f"{BASE_URL}/users/google-login", "POST", payload)
    
    print(f"Google Login sync response status: {status}")
    print(f"Response details: {res}")
    
    # Verify response body contents
    assert res.get("email") == email, f"Expected email {email}, got {res.get('email')}"
    assert res.get("provider") == "GOOGLE", f"Expected provider GOOGLE, got {res.get('provider')}"
    assert res.get("profilePicture") == photo_url, f"Expected picture {photo_url}, got {res.get('profilePicture')}"
    assert res.get("firstName") == "Firebase", f"Expected first name Firebase, got {res.get('firstName')}"
    assert res.get("lastName") == "Google Test User", f"Expected last name Google Test User, got {res.get('lastName')}"
    
    user_id = res.get("id")
    jwt_token = res.get("token")
    
    print(f"SUCCESS: Google Login synchronized user. ID: {user_id}, JWT generated.")
    
    # 3. Access a protected endpoint using the returned PaySphere JWT
    print(f"\n2. Verifying accessing profile using generated JWT token...")
    profile_res, status = make_request(f"{BASE_URL}/users/{user_id}/profile", "GET", token=jwt_token)
    print(f"Profile access successful. User Role: {profile_res.get('role')}")
    assert profile_res.get("email") == email
    
    # 4. Access a protected endpoint using the mock Firebase ID Token directly
    print(f"\n3. Verifying accessing profile using Firebase ID Token directly in Authorization header...")
    profile_res_fb, status_fb = make_request(f"{BASE_URL}/users/{user_id}/profile", "GET", token=mock_id_token)
    print(f"Direct Firebase token access successful. User Role: {profile_res_fb.get('role')}")
    assert profile_res_fb.get("email") == email
    
    # 5. Verify that standard API access fails with an invalid token
    print(f"\n4. Verifying rejection of invalid/unauthorized token...")
    try:
        make_request(f"{BASE_URL}/users/{user_id}/profile", "GET", token="invalid-token-123")
        print("FAILURE: Invalid token was accepted!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"SUCCESS: Access rejected with code {e.code} as expected.")
        else:
            print(f"Unexpected status code: {e.code}")
            sys.exit(1)
            
    print("\n=== FIREBASE GOOGLE SIGN-IN INTEGRATION VERIFIED SUCCESSFUL! ===")

if __name__ == "__main__":
    try:
        run_verification()
    except Exception as e:
        print(f"Verification failed: {e}")
        sys.exit(1)
