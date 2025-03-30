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

kubespray_dir = Path(__file__).resolve().parent / "kubespray"

if group_vars_src.exists():
    if group_vars_dest.exists():
        shutil.rmtree(group_vars_dest)
    shutil.copytree(group_vars_src, group_vars_dest)
    print(f"📂 group_vars copied to: {group_vars_dest}", flush=True)
else:
    print(f"⚠️ group_vars source folder not found: {group_vars_src}", flush=True)

print(f"📁 Creating inventory at: {hosts_file}", flush=True)

# 📦 Update group_vars YAML files with cluster config
group_vars_k8s = inventory_dir / "group_vars" / "k8s_cluster" / "k8s-cluster.yml"
group_vars_addons = inventory_dir / "group_vars" / "k8s_cluster" / "addons.yml"
kubespray_defaults = kubespray_dir / "roles" / "kubespray-defaults" / "defaults" / "main" / "download.yml"

def update_yaml_file(file_path, updates):
    if not file_path.exists():
        print(f"⚠️ {file_path} not found, skipping update", flush=True)
        return

    with open(file_path, "r") as f:
        data = yaml.safe_load(f) or {}

    data.update(updates)

    with open(file_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False)
    print(f"✅ Updated: {file_path}", flush=True)


runtime_map = {
    "DOCKER": "docker",
    "CONTAINERD": "containerd",
}

k8s_cluster_updates = {
    "kube_version": cluster_data.get("kubernetesVersion", "1.32.0"),
    "container_manager": runtime_map.get(cluster_data.get("containerRuntime", "CONTAINERD"), "containerd")
}

download_updates = {
    "containerd_version": cluster_data.get("containerVersion", "{{ (containerd_archive_checksums['amd64'] | dict2items)[0].key }}"),
    "cri_dockerd_version": cluster_data.get("containerVersion", "{{ (cri_dockerd_archive_checksums['amd64'] | dict2items)[0].key }}")
}


update_yaml_file(group_vars_k8s, k8s_cluster_updates)
update_yaml_file(kubespray_defaults, download_updates)

# ➕ Update addons in addons.yml
cluster_config = cluster_data.get("clusterConfig", {})
addons_updates = {
    "helm_enabled": cluster_config.get("helm", {}).get("enabled", True),
    "registry_enabled": cluster_config.get("registry", {}).get("enabled", False),
    "metrics_server_enabled": cluster_config.get("metrics", {}).get("enabled", False),
    "local_path_provisioner_enabled": cluster_config.get("localPathProvisioner", {}).get("enabled", False),
}

# ➕ Optional: Add detailed config if the addon is enabled

# ── Registry ─────────────────────────────
if addons_updates["registry_enabled"]:
    registry = cluster_config.get("registry", {})
    addons_updates["registry_namespace"] = registry.get("namespace", "kube-system")
    addons_updates["registry_storage_class"] = registry.get("storageClass", "")
    addons_updates["registry_disk_size"] = registry.get("diskSize", "10Gi")

# ── Metrics Server ───────────────────────
if addons_updates["metrics_server_enabled"]:
    metrics = cluster_config.get("metrics", {})
    addons_updates["metrics_server_container_port"] = metrics.get("containerPort", 10250)
    addons_updates["metrics_server_kubelet_insecure_tls"] = metrics.get("kubeletInsecureTls", False)
    addons_updates["metrics_server_metric_resolution"] = f"{metrics.get('metricResolution', 15)}s"
    addons_updates["metrics_server_host_network"] = metrics.get("hostNetwork", False)
    addons_updates["metrics_server_replicas"] = metrics.get("replicas", 1)

# ── Local Path Provisioner ───────────────
if addons_updates["local_path_provisioner_enabled"]:
    lp = cluster_config.get("localPathProvisioner", {})
    addons_updates["local_path_provisioner_namespace"] = lp.get("namespace", "local-path-storage")
    addons_updates["local_path_provisioner_storage_class"] = lp.get("storageClass", "local-path")
    addons_updates["local_path_provisioner_reclaim_policy"] = lp.get("reclaim_policy", "Delete")
    addons_updates["local_path_provisioner_claim_root"] = lp.get("claimRoot", "/opt/local-path-provisioner/")
    addons_updates["local_path_provisioner_debug"] = lp.get("debug", False)
    addons_updates["local_path_provisioner_image_repo"] = lp.get("imageRepo", "{{ docker_image_repo }}/rancher/local-path-provisioner")
    addons_updates["local_path_provisioner_image_tag"] = lp.get("imageTag", "v0.0.24")
    addons_updates["local_path_provisioner_helper_image_repo"] = lp.get("helperImageRepo", "busybox")
    addons_updates["local_path_provisioner_helper_image_tag"] = lp.get("helperImageTag", "latest")


update_yaml_file(group_vars_addons, addons_updates)



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
    name = node["hostname"]


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
# 🔒 Function to test SSH per node
def test_ssh_connection(ip, user, password=None, key_path=None):
    if key_path:
        ssh_cmd = ["ssh", "-i", str(key_path), "-o", "StrictHostKeyChecking=no", f"{user}@{ip}", "echo SSH_OK"]
    elif password:
        ssh_cmd = ["sshpass", "-p", password, "ssh", "-o", "StrictHostKeyChecking=no", "-o", "PreferredAuthentications=password", f"{user}@{ip}", "echo SSH_OK"]
    else:
        ssh_cmd = ["ssh", "-o", "StrictHostKeyChecking=no", f"{user}@{ip}", "echo SSH_OK"]

    try:
        result = subprocess.run(ssh_cmd, check=True, capture_output=True, text=True, timeout=10)
        return True, result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return False, e.stderr.strip()
    except Exception as ex:
        return False, str(ex)


# 🔍 Test SSH connection for each node before ansible
print("🔍 Testing raw SSH connection to all nodes...", flush=True)
try:
    for node in cluster_data.get("nodes", []):
        hostname = node["hostname"]
        ip = node["ipAddress"]
        user = node["username"]
        auth_type = node.get("authType")
        password = node.get("password")
        key_path = None

        if auth_type == "SSH_KEY":
            key_path = ssh_key_dir / f"{hostname}_id_rsa"

    if auth_type == "SSH_KEY":
        key_path = ssh_key_dir / f"{hostname}_id_rsa"

    success, output = test_ssh_connection(ip, user, password, key_path)
    if success:
        print(f"✅ SSH to {hostname} ({ip}) succeeded: {output}", flush=True)
    else:
        print(f"❌ SSH to {hostname} ({ip}) failed: {output}", flush=True)
        sys.exit(1)
except subprocess.CalledProcessError as e:
    print("❌ Ansible ssh failed:\n", e.stderr, flush=True)
    sys.exit(1)

print("✅ Script completed!", flush=True)
