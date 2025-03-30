import sys
import time
import requests

# Read command-line arguments
if len(sys.argv) >= 3:
    nextauth_url = sys.argv[1].rstrip('/')  # remove trailing slash just in case
    cluster_id = sys.argv[2]
else:
    print("❌ Missing arguments!", flush=True)
    sys.exit(1)

print(f"🚀 Script starting for cluster: {cluster_id}", flush=True)
print(f"🔗 NEXTAUTH_URL: {nextauth_url}", flush=True)

# Fetch from API
try:
    print("🌐 Fetching cluster info from API...", flush=True)
    response = requests.get(f"{nextauth_url}/api/clusters/?id={cluster_id}")
    response.raise_for_status()
    cluster_data = response.json()
    print(f"📦 Cluster info: {cluster_data}", flush=True)
except Exception as e:
    print(f"❌ Failed to fetch cluster data: {e}", flush=True)
    sys.exit(1)

# Simulate steps
for i in range(100):
    print(f"Step {i+1} running for cluster {cluster_id}...", flush=True)
    time.sleep(1)

print("✅ Script completed!", flush=True)
