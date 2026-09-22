import os
import django
import httpx

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings

print("=== CONFIGURATION PAYDUNYA ===")
print(f"Mode: {settings.PAYDUNYA_MODE}")
print(f"Master Key: {settings.PAYDUNYA_MASTER_KEY[:15]}...")
print(f"Private Key: {settings.PAYDUNYA_PRIVATE_KEY}")
print(f"Token: {settings.PAYDUNYA_TOKEN}")

# Test direct vers l'API PayDunya
headers = {
    "PAYDUNYA-MASTER-KEY": settings.PAYDUNYA_MASTER_KEY,
    "PAYDUNYA-PRIVATE-KEY": settings.PAYDUNYA_PRIVATE_KEY,
    "PAYDUNYA-TOKEN": settings.PAYDUNYA_TOKEN,
    "Content-Type": "application/json",
}

# Test 1: API v2 disburse (sandbox)
url = "https://app.paydunya.com/sandbox-api/v2/disburse/get-invoice"
payload = {
    "account_alias": "781324958",
    "amount": "1000",
    "withdraw_mode": "wave-senegal",
    "callback_url": "https://test.com/callback",
}

print("\n=== TEST DISBURSE API ===")
print(f"URL: {url}")
print(f"Payload: {payload}")

try:
    with httpx.Client(timeout=15.0) as client:
        res = client.post(url, json=payload, headers=headers)
    
    print(f"\nStatus: {res.status_code}")
    print(f"Response: {res.text}")
    
    data = res.json()
    print(f"\nResponse Code: {data.get('response_code')}")
    print(f"Response Text: {data.get('response_text')}")
except Exception as e:
    print(f"\nERREUR: {e}")
