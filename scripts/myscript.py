import sys
import time
import requests
import os
import subprocess
import yaml
from dotenv import load_dotenv
from pathlib import Path
import shutil

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

# Fetch cluster data
try:
    print("🌐 Fetching cluster info from API...", flush=True)
    headers = {"Authorization": f"Bearer {api_token}"}
    response = requests.get(f"{nextauth_url}/api/clusters/?id={cluster_id}", headers=headers)
    response.raise_for_status()
    cluster_data = response.json()
    print(f"📦 Cluster info: {cluster_data}", flush=True)
except Exception as e:
    print(f"❌ Failed to fetch cluster data: {e}", flush=True)
    sys.exit(1)

# Build inventory
inventory_dir = Path(__file__).resolve().parent / "kubespray" / "inventory" / cluster_id
inventory_dir.mkdir( exist_ok=True)
hosts_file = inventory_dir / "hosts.yaml"
ssh_key_dir = inventory_dir / "keys"
ssh_key_dir.mkdir( exist_ok=True)

# 📂 Copy group_vars
group_vars_src = Path(__file__).resolve().parent / "kubespray" / "inventory" / "local" / "group_vars"
group_vars_dest = inventory_dir / "group_vars"

if group_vars_src.exists():
    if group_vars_dest.exists():
        shutil.rmtree(group_vars_dest)
    shutil.copytree(group_vars_src, group_vars_dest)
    print(f"📂 group_vars copied to: {group_vars_dest}", flush=True)
else:
    print(f"⚠️ group_vars source folder not found: {group_vars_src}", flush=True)

print(f"📁 Creating inventory at: {hosts_file}", flush=True)

all_hosts = {}
children = {
    "kube_control_plane": {"hosts": {}},
    "kube_node": {"hosts": {}},
    "etcd": {"hosts": {}},
    "k8s_cluster": {"children": {"kube_control_plane": {}, "kube_node": {}}},
    "calico_rr": {"hosts": {}},
}

role_counters = {}

for node in cluster_data.get("nodes", []):
    role = node.get("role", "worker").lower()
    role_key = "master" if role == "master" else "worker"
    role_counters.setdefault(role_key, 0)
    role_counters[role_key] += 1
    name = f"{role_key}{role_counters[role_key]}"

    ip = node["ipAddress"]
    user = node["username"]
    auth_type = node.get("authType")
    host_entry = {
        "ip": ip,
        "access_ip": ip,
        "ansible_host": ip,
        "ansible_user": user
    }

    if auth_type == "PASSWORD":
        password = node["password"]
        host_entry["ansible_ssh_pass"] = password
        host_entry["ansible_become_password"] = password
    elif auth_type == "SSH_KEY":
        ssh_key = node.get("sshKey")
        if not ssh_key:
            print(f"❌ Missing sshKey for node {name}", flush=True)
            sys.exit(1)
        key_path = ssh_key_dir / f"{name}_id_rsa"
        with open(key_path, "w") as kf:
            kf.write(ssh_key)
        os.chmod(key_path, 0o600)
        host_entry["ansible_ssh_private_key_file"] = str(key_path)
        host_entry["ansible_become"] = True
    else:
        print(f"❌ Unknown authType '{auth_type}' for node {name}", flush=True)
        sys.exit(1)

    all_hosts[name] = host_entry

    if role_key == "master":
        children["kube_control_plane"]["hosts"][name] = {}
        children["etcd"]["hosts"][name] = {}
    else:
        children["kube_node"]["hosts"][name] = {}

# Final structure
inventory = {
    "all": {
        "hosts": all_hosts,
        "children": children,
    }
}

# Write YAML
with open(hosts_file, "w") as f:
    yaml.dump(inventory, f, default_flow_style=False)

print("✅ hosts.yaml generated successfully!", flush=True)

# 🔌 Run ansible ping to validate connectivity
print("🔍 Running Ansible ping check...", flush=True)
ping_cmd = [
    "ansible",
    "all",
    "-i", str(hosts_file),
    "-m", "ping",
]

try:
    result = subprocess.run(ping_cmd, check=True, capture_output=True, text=True)
    print("✅ Ansible ping successful:\n", result.stdout, flush=True)
except subprocess.CalledProcessError as e:
    print("❌ Ansible ping failed:\n", e.stderr, flush=True)
    sys.exit(1)

print("✅ Script completed!", flush=True)
