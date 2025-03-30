import sys
import time
import requests
import os
from dotenv import load_dotenv
from pathlib import Path

# Load env from ../dashboard-autokube/.env
env_path = Path(__file__).resolve().parent.parent / "dashboard-autokube" / ".env"
load_dotenv(dotenv_path=env_path)

# Read API token from .env
api_token = os.getenv("INTERNAL_API_TOKEN")
if not api_token:
    print("❌ INTERNAL_API_TOKEN not found in .env!", flush=True)
    sys.exit(1)

# Read command-line arguments
if len(sys.argv) >= 3:
    nextauth_url = sys.argv[1].rstrip('/')
    cluster_id = sys.argv[2]
else:
    print("❌ Missing arguments!", flush=True)
    sys.exit(1)

print(f"🚀 Script starting for cluster: {cluster_id}", flush=True)
print(f"🔗 NEXTAUTH_URL: {nextauth_url}", flush=True)

# Fetch from API with Authorization header
try:
    print("🌐 Fetching cluster info from API...", flush=True)
    headers = {
        "Authorization": f"Bearer {api_token}"
    }
    response = requests.get(f"{nextauth_url}/api/clusters/?id={cluster_id}", headers=headers)
    response.raise_for_status()
    cluster_data = response.json()
    print(f"📦 Cluster info: {cluster_data}", flush=True)
except Exception as e:
    print(f"❌ Failed to fetch cluster data: {e}", flush=True)
    sys.exit(1)

# # Simulate steps
# for i in range(100):
#     print(f"Step {i+1} running for cluster {cluster_id}...", flush=True)
#     time.sleep(1)

print("✅ Script completed!", flush=True)
