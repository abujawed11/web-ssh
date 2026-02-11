import {
  Activity,
  Boxes,
  Database,
  FileText,
  Flame,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  Network,
  Package,
  Shield,
  TerminalSquare,
  User,
  Wrench,
  Gauge,
  ShieldAlert,
  FileCode,
} from "lucide-react";

export const TASK_GROUPS = [
  {
    id: "system-info",
    title: "System Info",
    icon: Activity,
    description: "Quick system identification and baseline checks.",
    tasks: [
      { id: "os-release", title: "Detect OS", tags: ["system", "info"], command: "cat /etc/os-release || uname -a" },
      { id: "uname", title: "Kernel & Arch", tags: ["system", "info"], command: "uname -a" },
      { id: "uptime", title: "Uptime & Load", tags: ["system", "info"], command: "uptime" },
      { id: "cpu", title: "CPU Info", tags: ["system", "info"], command: "lscpu || cat /proc/cpuinfo | head" },
      { id: "mem", title: "Memory Usage", tags: ["system", "info"], command: "free -h || vm_stat" },
      { id: "top", title: "Top Processes", tags: ["system", "process"], command: "ps aux --sort=-%mem | head -n 20" },
      { id: "env", title: "Env Vars (preview)", tags: ["system", "debug"], command: "env | sort | sed -n '1,80p'" },
    ],
  },
  {
    id: "packages",
    title: "Packages",
    icon: Package,
    description: "APT/YUM package management shortcuts.",
    tasks: [
      { id: "apt-update", title: "APT Update", tags: ["apt", "install"], command: "sudo apt-get update" },
      { id: "apt-upgrade", title: "APT Upgrade", tags: ["apt", "install"], command: "sudo apt-get upgrade -y" },
      { id: "apt-fix", title: "Fix Broken Packages", tags: ["apt", "repair"], command: "sudo apt-get -f install -y" },
      { id: "pkg-search", title: "Search Package (APT)", tags: ["apt", "info"], command: "apt-cache search nginx | head -n 30" },
      { id: "pkg-installed", title: "List Installed (APT)", tags: ["apt", "info"], command: "dpkg -l | sed -n '1,60p'" },
      { id: "yum-info", title: "YUM/DNF Info", tags: ["yum", "info"], command: "command -v dnf && dnf --version || yum --version || true" },
    ],
  },
  {
    id: "users-ssh",
    title: "Users & SSH",
    icon: User,
    description: "User checks and SSH daemon basics.",
    tasks: [
      { id: "whoami", title: "Who am I", tags: ["user", "info"], command: "whoami && id" },
      { id: "users", title: "Logged-in Users", tags: ["user", "info"], command: "who || w" },
      { id: "sudo-check", title: "Sudo Privileges", tags: ["user", "security"], command: "sudo -n true && echo 'sudo: yes' || echo 'sudo: no'" },
      { id: "ssh-status", title: "SSH Service Status", tags: ["ssh", "service"], command: "sudo systemctl status ssh --no-pager || sudo service ssh status || true" },
      { id: "ssh-config", title: "Show sshd_config (key lines)", tags: ["ssh", "config"], command: "sudo grep -E '^(Port|PermitRootLogin|PasswordAuthentication|PubkeyAuthentication|AllowUsers|AllowGroups)' /etc/ssh/sshd_config || true" },
      { id: "auth-log", title: "Auth Log (tail)", tags: ["ssh", "logs"], command: "sudo tail -n 80 /var/log/auth.log 2>/dev/null || sudo journalctl -u ssh -n 80 --no-pager || true" },
    ],
  },
  {
    id: "network",
    title: "Networking",
    icon: Network,
    description: "IPs, routes, DNS, and ports.",
    tasks: [
      { id: "ip-a", title: "IP Addresses", tags: ["network", "info"], command: "ip a || ifconfig" },
      { id: "routes", title: "Routes", tags: ["network", "info"], command: "ip route || netstat -rn" },
      { id: "dns", title: "DNS Resolver", tags: ["network", "info"], command: "cat /etc/resolv.conf || true" },
      { id: "ping", title: "Ping 1.1.1.1", tags: ["network", "debug"], command: "ping -c 4 1.1.1.1 || true" },
      { id: "curl-ip", title: "Public IP", tags: ["network", "info"], command: "curl -s ifconfig.me || curl -s https://api.ipify.org || true" },
      { id: "listening", title: "Listening Ports", tags: ["network", "info"], command: "sudo ss -tulpn || sudo netstat -tulpn || true" },
      { id: "firewall", title: "UFW Status", tags: ["security", "firewall"], command: "sudo ufw status verbose || true" },
    ],
  },
  {
    id: "network-tools",
    title: "Network Tools",
    icon: Gauge,
    description: "Internet speed test, bandwidth monitoring, and firewall management.",
    tasks: [
      {
        id: "speedtest-check",
        title: "Check Speedtest Availability",
        tags: ["network", "info", "speed"],
        command: "echo 'Checking speedtest tools...' && (command -v speedtest-cli && echo '✓ speedtest-cli found' || echo '✗ speedtest-cli not found') && (command -v speedtest && echo '✓ speedtest (Ookla) found' || echo '✗ speedtest (Ookla) not found') && (command -v curl && echo '✓ curl found (can use curl-based tests)' || echo '✗ curl not found')"
      },
      {
        id: "speedtest-install-python",
        title: "Install Speedtest (Python)",
        tags: ["network", "install", "speed"],
        command: "sudo apt-get update && sudo apt-get install -y speedtest-cli"
      },
      {
        id: "speedtest-install-ookla",
        title: "Install Speedtest (Ookla Official)",
        tags: ["network", "install", "speed"],
        command: "curl -s https://packagecloud.io/install/repositories/ookla/speedtest-cli/script.deb.sh | sudo bash && sudo apt-get install -y speedtest-cli"
      },
      {
        id: "speedtest",
        title: "Internet Speed Test",
        tags: ["network", "speed", "bandwidth"],
        command: "speedtest-cli || speedtest || echo 'Speedtest not installed. Install it first.'"
      },
      {
        id: "speedtest-simple",
        title: "Speed Test (Simple)",
        tags: ["network", "speed"],
        command: "speedtest-cli --simple 2>/dev/null || speedtest --simple 2>/dev/null || echo 'Speedtest not found'"
      },
      {
        id: "speedtest-bytes",
        title: "Speed Test (Bytes)",
        tags: ["network", "speed"],
        command: "speedtest-cli --bytes 2>/dev/null || echo 'Speedtest not found'"
      },
      {
        id: "speedtest-share",
        title: "Speed Test (with Share Link)",
        tags: ["network", "speed"],
        command: "speedtest-cli --share 2>/dev/null || echo 'Speedtest not found'"
      },
      {
        id: "download-speed-curl",
        title: "Download Speed (curl 10MB)",
        tags: ["network", "speed", "download"],
        command: "echo 'Testing download speed...' && curl -o /dev/null -w 'Speed: %{speed_download} bytes/sec (%.2f MB/s)\\nTime: %{time_total}s\\nSize: %{size_download} bytes\\n' http://speedtest.tele2.net/10MB.zip 2>/dev/null || echo 'Test failed'"
      },
      {
        id: "download-speed-100mb",
        title: "Download Speed (curl 100MB)",
        tags: ["network", "speed", "download"],
        command: "echo 'Testing download speed (100MB)...' && curl -o /dev/null -w 'Speed: %{speed_download} bytes/sec\\nTime: %{time_total}s\\n' http://speedtest.tele2.net/100MB.zip 2>/dev/null || echo 'Test failed'"
      },
      {
        id: "upload-speed-curl",
        title: "Upload Speed Test",
        tags: ["network", "speed", "upload"],
        command: "dd if=/dev/zero bs=1M count=10 2>/dev/null | curl -o /dev/null -w 'Upload Speed: %{speed_upload} bytes/sec\\nTime: %{time_total}s\\n' -T - http://speedtest.tele2.net/upload.php 2>/dev/null || echo 'Test failed'"
      },
      {
        id: "ping-test",
        title: "Ping Test (Multiple Servers)",
        tags: ["network", "speed", "latency"],
        command: "echo '=== Google DNS ===' && ping -c 4 8.8.8.8 | tail -2 && echo '\\n=== Cloudflare ===' && ping -c 4 1.1.1.1 | tail -2"
      },
      {
        id: "bandwidth-monitor",
        title: "Bandwidth Monitor (5 sec)",
        tags: ["network", "monitor"],
        command: "ifstat -i $(ip route | grep default | awk '{print $5}' | head -1) 1 5 2>/dev/null || echo 'ifstat not installed: sudo apt install ifstat'"
      },
      {
        id: "network-usage",
        title: "Network Usage Stats",
        tags: ["network", "stats"],
        command: "cat /proc/net/dev | awk 'NR>2 {print $1, \"RX:\", $2, \"bytes TX:\", $10, \"bytes\"}' | column -t"
      },

      // Firewall Management
      {
        id: "firewall-ufw-status",
        title: "Firewall: UFW Status (detailed)",
        tags: ["firewall", "security"],
        command: "sudo ufw status verbose || echo 'UFW not installed'"
      },
      {
        id: "firewall-ufw-rules",
        title: "Firewall: List All Rules",
        tags: ["firewall", "security"],
        command: "sudo ufw status numbered || echo 'UFW not installed'"
      },
      {
        id: "firewall-enable",
        title: "Firewall: Enable UFW",
        tags: ["firewall", "security"],
        command: "sudo ufw --force enable && sudo ufw status verbose"
      },
      {
        id: "firewall-disable",
        title: "Firewall: Disable UFW",
        tags: ["firewall", "security", "danger"],
        command: "sudo ufw disable && sudo ufw status"
      },
      {
        id: "firewall-allow-ssh",
        title: "Firewall: Allow SSH (22)",
        tags: ["firewall", "security", "ssh"],
        command: "sudo ufw allow 22/tcp && sudo ufw status"
      },
      {
        id: "firewall-allow-http",
        title: "Firewall: Allow HTTP (80)",
        tags: ["firewall", "security", "web"],
        command: "sudo ufw allow 80/tcp && sudo ufw status"
      },
      {
        id: "firewall-allow-https",
        title: "Firewall: Allow HTTPS (443)",
        tags: ["firewall", "security", "web"],
        command: "sudo ufw allow 443/tcp && sudo ufw status"
      },
      {
        id: "firewall-allow-custom",
        title: "Firewall: Allow Custom Port",
        tags: ["firewall", "security"],
        requires: ["port"],
        command: "sudo ufw allow {{port}}/tcp && sudo ufw status"
      },
      {
        id: "firewall-deny-port",
        title: "Firewall: Deny Port",
        tags: ["firewall", "security"],
        requires: ["port"],
        command: "sudo ufw deny {{port}} && sudo ufw status"
      },
      {
        id: "firewall-delete-rule",
        title: "Firewall: Delete Rule by Number",
        tags: ["firewall", "security"],
        requires: ["rule_number"],
        command: "sudo ufw delete {{rule_number}} && sudo ufw status numbered"
      },
      {
        id: "firewall-reset",
        title: "Firewall: Reset UFW (danger)",
        tags: ["firewall", "security", "danger"],
        command: "sudo ufw --force reset && echo 'Firewall reset complete'"
      },
      {
        id: "firewall-default-deny",
        title: "Firewall: Set Default DENY Incoming",
        tags: ["firewall", "security"],
        command: "sudo ufw default deny incoming && sudo ufw default allow outgoing && sudo ufw status"
      },
      {
        id: "firewall-iptables-list",
        title: "Firewall: IPTables Rules",
        tags: ["firewall", "security", "iptables"],
        command: "sudo iptables -L -n -v --line-numbers | head -n 100"
      },
      {
        id: "firewall-connections",
        title: "Firewall: Active Connections",
        tags: ["firewall", "network", "security"],
        command: "sudo ss -tunap | head -n 50 || sudo netstat -tunap | head -n 50"
      },
    ],
  },
  {
    id: "disk-fs",
    title: "Disk & Filesystem",
    icon: HardDrive,
    description: "Disk space, mounts, and large files.",
    tasks: [
      { id: "df", title: "Disk Usage (df)", tags: ["disk", "info"], command: "df -hT" },
      { id: "du", title: "Directory Size (cwd)", tags: ["disk", "info"], command: "du -sh ./* 2>/dev/null | sort -hr | head -n 20" },
      { id: "mounts", title: "Mounts", tags: ["disk", "info"], command: "mount | sed -n '1,60p'" },
      { id: "inode", title: "Inode Usage", tags: ["disk", "info"], command: "df -ih" },
      { id: "largest", title: "Largest Files (cwd)", tags: ["disk", "cleanup"], command: "find . -maxdepth 3 -type f -printf '%s %p\\n' 2>/dev/null | sort -nr | head -n 20" },
    ],
  },
  {
    id: "services",
    title: "Services",
    icon: Wrench,
    description: "Systemd/service basics.",
    tasks: [
      { id: "systemctl-failed", title: "Failed Units", tags: ["systemd", "debug"], command: "sudo systemctl --failed --no-pager || true" },
      { id: "systemctl-list", title: "Running Services", tags: ["systemd", "info"], command: "sudo systemctl list-units --type=service --state=running --no-pager | sed -n '1,80p'" },
      { id: "journal", title: "Journal Tail", tags: ["logs", "debug"], command: "sudo journalctl -n 120 --no-pager || true" },
      { id: "dmesg", title: "dmesg (tail)", tags: ["kernel", "debug"], command: "sudo dmesg | tail -n 120 || true" },
    ],
  },
  {
    id: "service-control",
    title: "Service Control",
    icon: Wrench,
    description: "Interactive systemd runbooks (pick a service, then run actions).",
    tasks: [
      {
        id: "svc-restart",
        title: "Restart service",
        tags: ["systemd", "service"],
        requires: ["service"],
        command: "sudo systemctl restart {{service}}",
      },
      {
        id: "svc-status",
        title: "Status",
        tags: ["systemd", "service"],
        requires: ["service"],
        command: "sudo systemctl status {{service}} --no-pager",
      },
      {
        id: "svc-follow-logs",
        title: "Follow logs (stream)",
        tags: ["systemd", "logs"],
        requires: ["service"],
        longRunning: true,
        command: "sudo journalctl -u {{service}} -f --no-pager",
      },
      {
        id: "svc-last-200",
        title: "Last 200 logs",
        tags: ["systemd", "logs"],
        requires: ["service"],
        command: "sudo journalctl -u {{service}} -n 200 --no-pager",
      },
      {
        id: "svc-failed",
        title: "Failed services",
        tags: ["systemd", "debug"],
        command: "sudo systemctl --failed --no-pager || true",
      },
    ],
  },
  {
    id: "nodejs",
    title: "Node.js",
    icon: TerminalSquare,
    description: "Install/check Node, npm, and common process managers.",
    tasks: [
      {
        id: "node-install-20",
        title: "Install Node.js 20 (Ubuntu/Debian)",
        tags: ["node", "install"],
        command:
          "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs",
      },
      { id: "node-version", title: "Node & npm version", tags: ["node", "info"], command: "node -v && npm -v" },
      { id: "corepack", title: "Enable Corepack", tags: ["node", "tools"], command: "sudo corepack enable || corepack enable" },
      { id: "pnpm", title: "Install pnpm (corepack)", tags: ["node", "tools"], command: "corepack prepare pnpm@latest --activate" },
      { id: "pm2-install", title: "Install PM2", tags: ["node", "pm2"], command: "sudo npm i -g pm2" },
      { id: "pm2-list", title: "PM2 List", tags: ["node", "pm2"], command: "pm2 ls || true" },
      { id: "pm2-logs", title: "PM2 Logs (last 100)", tags: ["node", "pm2"], command: "pm2 logs --lines 100 || true" },
    ],
  },
  {
    id: "docker",
    title: "Docker",
    icon: Boxes,
    description: "Common Docker and Compose actions.",
    tasks: [
      { id: "docker-version", title: "Docker: Version", tags: ["docker", "info"], command: "docker version || true" },
      { id: "docker-info", title: "Docker: Info", tags: ["docker", "info"], command: "docker info || true" },
      { id: "docker-df", title: "Docker: Disk usage", tags: ["docker", "info"], command: "docker system df || true" },
      { id: "docker-ps", title: "Docker: List containers", tags: ["docker", "info"], command: "docker ps -a" },
      { id: "docker-ps-running", title: "Docker: Running containers", tags: ["docker", "info"], command: "docker ps" },
      { id: "docker-images", title: "Docker: List images", tags: ["docker", "info"], command: "docker images" },
      { id: "docker-networks", title: "Docker: List networks", tags: ["docker", "info"], command: "docker network ls || true" },
      { id: "docker-volumes", title: "Docker: List volumes", tags: ["docker", "info"], command: "docker volume ls || true" },
      { id: "docker-stats", title: "Docker: Container stats", tags: ["docker", "info"], command: "docker stats --no-stream || true" },
      { id: "docker-events", title: "Docker: Events (stream)", tags: ["docker", "debug"], longRunning: true, command: "docker events" },

      { id: "compose-ps", title: "Compose: ps", tags: ["docker", "compose"], command: "docker compose ps || docker-compose ps || true" },
      { id: "compose-logs", title: "Compose: logs (tail)", tags: ["docker", "compose"], command: "docker compose logs --tail 200 || docker-compose logs --tail 200 || true" },
      { id: "compose-logs-follow", title: "Compose: logs (follow)", tags: ["docker", "compose"], longRunning: true, command: "docker compose logs -f --tail 200 || docker-compose logs -f --tail 200 || true" },
      { id: "compose-restart", title: "Compose: restart", tags: ["docker", "compose"], command: "docker compose restart || docker-compose restart || true" },

      {
        id: "docker-container-ps",
        title: "Container: Details",
        tags: ["docker", "container"],
        requires: ["container"],
        command: "docker ps -a --filter \"name={{container}}\"",
      },
      {
        id: "docker-container-status",
        title: "Container: Status (state/health)",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command:
          "docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' {{container}} 2>/dev/null || docker inspect -f '{{.State.Status}}' {{container}} 2>/dev/null || true",
      },
      {
        id: "docker-container-start",
        title: "Container: Start",
        tags: ["docker", "container"],
        requires: ["container"],
        command: "docker start {{container}}",
      },
      {
        id: "docker-container-stop",
        title: "Container: Stop",
        tags: ["docker", "container"],
        requires: ["container"],
        command: "docker stop {{container}}",
      },
      {
        id: "docker-container-restart",
        title: "Container: Restart",
        tags: ["docker", "container"],
        requires: ["container"],
        command: "docker restart {{container}}",
      },
      {
        id: "docker-container-logs-tail",
        title: "Container: Logs (tail 200)",
        tags: ["docker", "container", "logs"],
        requires: ["container"],
        command: "docker logs --tail 200 {{container}} || true",
      },
      {
        id: "docker-container-logs-follow",
        title: "Container: Logs (follow)",
        tags: ["docker", "container", "logs"],
        requires: ["container"],
        longRunning: true,
        command: "docker logs -f {{container}}",
      },
      {
        id: "docker-container-top",
        title: "Container: Processes (top)",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command: "docker top {{container}} || true",
      },
      {
        id: "docker-container-stats",
        title: "Container: Stats (no-stream)",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command: "docker stats --no-stream {{container}} || true",
      },
      {
        id: "docker-container-ports",
        title: "Container: Ports",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command: "docker port {{container}} || true",
      },
      {
        id: "docker-container-inspect",
        title: "Container: Inspect (summary)",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command: "docker inspect {{container}} | sed -n '1,120p'",
      },
      {
        id: "docker-container-env",
        title: "Container: Env (from inspect)",
        tags: ["docker", "container", "info"],
        requires: ["container"],
        command: "docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' {{container}} 2>/dev/null | sed -n '1,200p' || true",
      },
      {
        id: "docker-container-sh-check",
        title: "Container: Run a quick shell check",
        tags: ["docker", "container"],
        requires: ["container"],
        command: "docker exec {{container}} sh -lc 'whoami; pwd; ls -la | sed -n \"1,80p\"' 2>/dev/null || true",
      },
      {
        id: "docker-container-remove-force",
        title: "Container: Remove (force)",
        tags: ["docker", "container", "danger"],
        requires: ["container"],
        command: "docker rm -f {{container}}",
      },

      {
        id: "docker-image-pull",
        title: "Image: Pull",
        tags: ["docker", "image"],
        requires: ["image"],
        command: "docker pull {{image}}",
      },
      {
        id: "docker-image-inspect",
        title: "Image: Inspect (summary)",
        tags: ["docker", "image", "info"],
        requires: ["image"],
        command: "docker inspect {{image}} | sed -n '1,160p' || true",
      },
      {
        id: "docker-image-history",
        title: "Image: History",
        tags: ["docker", "image"],
        requires: ["image"],
        command: "docker history {{image}} || true",
      },
      {
        id: "docker-image-containers",
        title: "Image: Containers using this image",
        tags: ["docker", "image", "info"],
        requires: ["image"],
        command: "docker ps -a --filter ancestor={{image}} --format 'table {{.Names}}\\t{{.Status}}\\t{{.Image}}' || true",
      },
      {
        id: "docker-image-remove",
        title: "Image: Remove (rmi)",
        tags: ["docker", "image", "danger"],
        requires: ["image"],
        command: "docker rmi {{image}}",
      },
    ],
  },
  {
    id: "nginx",
    title: "Nginx",
    icon: Globe,
    description: "Install and troubleshoot Nginx.",
    tasks: [
      { id: "nginx-install", title: "Install Nginx", tags: ["nginx", "install"], command: "sudo apt-get update && sudo apt-get install -y nginx" },
      { id: "nginx-status", title: "Nginx Status", tags: ["nginx", "service"], command: "sudo systemctl status nginx --no-pager || true" },
      { id: "nginx-test", title: "Test Config", tags: ["nginx", "config"], command: "sudo nginx -t || true" },
      { id: "nginx-sites", title: "List Sites Enabled", tags: ["nginx", "config"], command: "ls -la /etc/nginx/sites-enabled || true" },
      { id: "nginx-sites-available", title: "List Sites Available", tags: ["nginx", "config"], command: "ls -la /etc/nginx/sites-available || true" },
      { id: "nginx-conf", title: "View nginx.conf", tags: ["nginx", "config"], command: "sudo sed -n '1,200p' /etc/nginx/nginx.conf || true" },
      { id: "nginx-reload", title: "Reload Nginx", tags: ["nginx", "service"], command: "sudo systemctl reload nginx || true" },
      { id: "nginx-restart", title: "Restart Nginx", tags: ["nginx", "service"], command: "sudo systemctl restart nginx || true" },
      { id: "nginx-logs", title: "Access/Error Logs (tail)", tags: ["nginx", "logs"], command: "sudo tail -n 120 /var/log/nginx/access.log /var/log/nginx/error.log 2>/dev/null || true" },
      { id: "nginx-error-follow", title: "Error log (follow)", tags: ["nginx", "logs"], longRunning: true, command: "sudo tail -f /var/log/nginx/error.log 2>/dev/null || true" },
      { id: "nginx-access-follow", title: "Access log (follow)", tags: ["nginx", "logs"], longRunning: true, command: "sudo tail -f /var/log/nginx/access.log 2>/dev/null || true" },
      { id: "nginx-listen", title: "Listening ports (nginx)", tags: ["nginx", "debug"], command: "sudo ss -ltnp | grep -i nginx || true" },
      {
        id: "nginx-site-view",
        title: "Enabled site: View config",
        tags: ["nginx", "config"],
        requires: ["nginx_site"],
        command: "sudo sed -n '1,200p' /etc/nginx/sites-enabled/{{nginx_site}} || true",
      },
      {
        id: "nginx-site-resolve",
        title: "Enabled site: Resolve symlink target",
        tags: ["nginx", "config"],
        requires: ["nginx_site"],
        command: "readlink -f /etc/nginx/sites-enabled/{{nginx_site}} || true",
      },
      {
        id: "nginx-site-view-resolved",
        title: "Enabled site: View resolved file",
        tags: ["nginx", "config"],
        requires: ["nginx_site"],
        command:
          "p=$(readlink -f /etc/nginx/sites-enabled/{{nginx_site}} 2>/dev/null) && [ -n \"$p\" ] && sudo sed -n '1,220p' \"$p\" || true",
      },
      {
        id: "nginx-site-grep",
        title: "Enabled site: Find server_name/listen",
        tags: ["nginx", "config"],
        requires: ["nginx_site"],
        command: "sudo grep -nE 'server_name|listen' /etc/nginx/sites-enabled/{{nginx_site}} || true",
      },
      {
        id: "nginx-site-disable",
        title: "Enabled site: Disable (remove symlink)",
        tags: ["nginx", "danger"],
        requires: ["nginx_site"],
        command: "sudo rm -f /etc/nginx/sites-enabled/{{nginx_site}} && echo 'disabled' || true",
      },
      {
        id: "nginx-site-disable-reload",
        title: "Enabled site: Disable + test + reload",
        tags: ["nginx", "danger"],
        requires: ["nginx_site"],
        command: "sudo rm -f /etc/nginx/sites-enabled/{{nginx_site}} && sudo nginx -t && sudo systemctl reload nginx || true",
      },
      {
        id: "nginx-available-view",
        title: "Available site: View config",
        tags: ["nginx", "config"],
        requires: ["nginx_site_available"],
        command: "sudo sed -n '1,220p' /etc/nginx/sites-available/{{nginx_site_available}} || true",
      },
      {
        id: "nginx-available-enable",
        title: "Available site: Enable (symlink)",
        tags: ["nginx", "danger"],
        requires: ["nginx_site_available"],
        command:
          "sudo ln -sfn /etc/nginx/sites-available/{{nginx_site_available}} /etc/nginx/sites-enabled/{{nginx_site_available}} && echo 'enabled' || true",
      },
      {
        id: "nginx-available-enable-reload",
        title: "Available site: Enable + test + reload",
        tags: ["nginx", "danger"],
        requires: ["nginx_site_available"],
        command:
          "sudo ln -sfn /etc/nginx/sites-available/{{nginx_site_available}} /etc/nginx/sites-enabled/{{nginx_site_available}} && sudo nginx -t && sudo systemctl reload nginx || true",
      },
      {
        id: "nginx-site-test-and-reload",
        title: "Test & reload (after edits)",
        tags: ["nginx", "service"],
        command: "sudo nginx -t && sudo systemctl reload nginx",
      },
    ],
  },
  {
    id: "databases",
    title: "Databases",
    icon: Database,
    description: "Postgres/MySQL quick checks.",
    tasks: [
      { id: "postgres-status", title: "Postgres Status", tags: ["postgres", "service"], command: "sudo systemctl status postgresql --no-pager || true" },
      { id: "postgres-conn", title: "Postgres: psql connect (local)", tags: ["postgres", "cli"], command: "psql -U postgres -c 'SELECT version();' || true" },
      { id: "mysql-status", title: "MySQL Status", tags: ["mysql", "service"], command: "sudo systemctl status mysql --no-pager || true" },
      { id: "mysql-version", title: "MySQL: version", tags: ["mysql", "cli"], command: "mysql --version || true" },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: Shield,
    description: "Basic security checks (read-only).",
    tasks: [
      { id: "ufw", title: "UFW Status", tags: ["security", "firewall"], command: "sudo ufw status verbose || true" },
      { id: "fail2ban", title: "Fail2ban Status", tags: ["security", "fail2ban"], command: "sudo fail2ban-client status || true" },
      { id: "sudoers", title: "Sudoers (who can sudo)", tags: ["security", "sudo"], command: "getent group sudo || getent group wheel || true" },
      { id: "lastlog", title: "Recent Logins", tags: ["security", "auth"], command: "last -n 30 || true" },
      { id: "ssh-keys", title: "Authorized Keys (current user)", tags: ["security", "ssh"], command: "ls -la ~/.ssh && sed -n '1,120p' ~/.ssh/authorized_keys 2>/dev/null || true" },
    ],
  },
  {
    id: "logs",
    title: "Logs",
    icon: FileText,
    description: "Quick log tails for common services.",
    tasks: [
      { id: "syslog", title: "syslog (tail)", tags: ["logs"], command: "sudo tail -n 200 /var/log/syslog 2>/dev/null || true" },
      { id: "messages", title: "messages (tail)", tags: ["logs"], command: "sudo tail -n 200 /var/log/messages 2>/dev/null || true" },
      { id: "journal-nginx", title: "journalctl nginx", tags: ["logs", "nginx"], command: "sudo journalctl -u nginx -n 200 --no-pager || true" },
      { id: "journal-docker", title: "journalctl docker", tags: ["logs", "docker"], command: "sudo journalctl -u docker -n 200 --no-pager || true" },
    ],
  },
  {
    id: "git",
    title: "Git",
    icon: Layers,
    description: "Common git operations (read-only / safe).",
    tasks: [
      { id: "git-version", title: "Git Version", tags: ["git", "info"], command: "git --version || true" },
      { id: "git-status", title: "git status", tags: ["git", "repo"], command: "git status || true" },
      { id: "git-branches", title: "Branches", tags: ["git", "repo"], command: "git branch -av || true" },
      { id: "git-log", title: "Recent Commits", tags: ["git", "repo"], command: "git --no-pager log --oneline -n 20 || true" },
      { id: "git-remote", title: "Remotes", tags: ["git", "repo"], command: "git remote -v || true" },
    ],
  },
  {
    id: "templates",
    title: "Templates",
    icon: FileCode,
    description: "Deploy ready-to-use templates (HTML pages, configs, docker-compose, etc).",
    tasks: [
      {
        id: "template-index-modern",
        title: "Deploy Modern Index.html",
        tags: ["template", "html", "nginx"],
        command: `sudo bash -c 'cat > /var/www/html/index.html << \"EOF\"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            animation: fadeInUp 0.8s ease;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 2rem;
            animation: fadeInUp 1s ease;
        }
        .badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 0.5rem 1.5rem;
            border-radius: 50px;
            font-size: 0.9rem;
            animation: fadeInUp 1.2s ease;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Server is Running</h1>
        <p>Your nginx server is successfully configured and running!</p>
        <div class="badge">✓ Status: Online</div>
    </div>
</body>
</html>
EOF
' && echo '✓ Modern index.html deployed to /var/www/html/'`
      },
      {
        id: "template-index-professional",
        title: "Deploy Professional Landing Page",
        tags: ["template", "html", "nginx"],
        command: `sudo bash -c 'cat > /var/www/html/index.html << \"EOF\"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: \"Inter\", -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
        }
        header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            padding: 1rem 0;
            border-bottom: 1px solid #334155;
        }
        nav {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo { font-size: 1.5rem; font-weight: bold; color: #818cf8; }
        .hero {
            max-width: 1200px;
            margin: 0 auto;
            padding: 6rem 2rem;
            text-align: center;
        }
        h1 {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            font-size: 1.25rem;
            color: #94a3b8;
            margin-bottom: 3rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 2rem 4rem;
        }
        .feature {
            background: #1e293b;
            padding: 2rem;
            border-radius: 1rem;
            border: 1px solid #334155;
            transition: transform 0.3s, border-color 0.3s;
        }
        .feature:hover {
            transform: translateY(-5px);
            border-color: #818cf8;
        }
        .feature h3 {
            color: #818cf8;
            margin-bottom: 0.5rem;
            font-size: 1.25rem;
        }
        .icon {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        footer {
            text-align: center;
            padding: 2rem;
            color: #64748b;
            border-top: 1px solid #334155;
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <div class="logo">⚡ YourBrand</div>
        </nav>
    </header>

    <div class="hero">
        <h1>Welcome to Your Server</h1>
        <p class="subtitle">Your nginx server is up and running. Start building something amazing!</p>
    </div>

    <div class="features">
        <div class="feature">
            <div class="icon">🚀</div>
            <h3>Fast & Secure</h3>
            <p>Built on nginx for maximum performance and reliability.</p>
        </div>
        <div class="feature">
            <div class="icon">⚙️</div>
            <h3>Easy to Configure</h3>
            <p>Simple configuration with powerful customization options.</p>
        </div>
        <div class="feature">
            <div class="icon">📊</div>
            <h3>Scalable</h3>
            <p>Designed to grow with your needs, from startup to enterprise.</p>
        </div>
    </div>

    <footer>
        <p>&copy; 2024 Your Company. All rights reserved.</p>
    </footer>
</body>
</html>
EOF
' && echo '✓ Professional landing page deployed to /var/www/html/'`
      },
      {
        id: "template-coming-soon",
        title: "Deploy Coming Soon Page",
        tags: ["template", "html", "nginx"],
        command: `sudo bash -c 'cat > /var/www/html/index.html << \"EOF\"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coming Soon</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: pulse 2s infinite;
        }
        p {
            font-size: 1.5rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }
        .countdown {
            display: flex;
            gap: 2rem;
            justify-content: center;
            margin-top: 3rem;
        }
        .time-unit {
            background: rgba(255,255,255,0.1);
            padding: 1.5rem 2rem;
            border-radius: 1rem;
            backdrop-filter: blur(10px);
        }
        .time-unit span {
            display: block;
            font-size: 3rem;
            font-weight: bold;
        }
        .time-unit label {
            font-size: 0.9rem;
            opacity: 0.8;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 Coming Soon</h1>
        <p>We're working on something amazing. Stay tuned!</p>
        <div class="countdown">
            <div class="time-unit">
                <span>00</span>
                <label>Days</label>
            </div>
            <div class="time-unit">
                <span>00</span>
                <label>Hours</label>
            </div>
            <div class="time-unit">
                <span>00</span>
                <label>Minutes</label>
            </div>
        </div>
    </div>
</body>
</html>
EOF
' && echo '✓ Coming Soon page deployed to /var/www/html/'`
      },
      {
        id: "template-maintenance",
        title: "Deploy Maintenance Page",
        tags: ["template", "html", "nginx"],
        command: `sudo bash -c 'cat > /var/www/html/index.html << \"EOF\"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Under Maintenance</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #1a1a2e;
            color: #eee;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
        }
        .icon {
            font-size: 5rem;
            margin-bottom: 2rem;
            animation: spin 3s linear infinite;
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: #f39c12;
        }
        p {
            font-size: 1.2rem;
            opacity: 0.8;
            line-height: 1.8;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>Under Maintenance</h1>
        <p>We're currently performing scheduled maintenance.<br>We'll be back up and running shortly.</p>
    </div>
</body>
</html>
EOF
' && echo '✓ Maintenance page deployed to /var/www/html/'`
      },
      {
        id: "template-404",
        title: "Deploy Custom 404 Page",
        tags: ["template", "html", "nginx"],
        command: `sudo bash -c 'cat > /var/www/html/404.html << \"EOF\"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f0f23;
            color: #e0e0e0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .error-code {
            font-size: 8rem;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 1rem;
        }
        p {
            font-size: 1.1rem;
            opacity: 0.7;
            margin-bottom: 2rem;
        }
        a {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem 2rem;
            border-radius: 50px;
            text-decoration: none;
            transition: transform 0.3s;
        }
        a:hover {
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="/">Go Home</a>
    </div>
</body>
</html>
EOF
' && echo '✓ Custom 404 page deployed to /var/www/html/404.html'`
      },
      {
        id: "template-nginx-reverse-proxy",
        title: "Nginx: Reverse Proxy Template",
        tags: ["template", "nginx", "config"],
        requires: ["domain", "backend_port"],
        command: `sudo bash -c 'cat > /etc/nginx/sites-available/{{domain}} << \"EOF\"
server {
    listen 80;
    server_name {{domain}};

    location / {
        proxy_pass http://localhost:{{backend_port}};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
    }
}
EOF
' && echo '✓ Reverse proxy config created. Enable with: sudo ln -s /etc/nginx/sites-available/{{domain}} /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx'`
      },
      {
        id: "template-nginx-static",
        title: "Nginx: Static Site Template",
        tags: ["template", "nginx", "config"],
        requires: ["domain", "root_path"],
        command: `sudo bash -c 'cat > /etc/nginx/sites-available/{{domain}} << \"EOF\"
server {
    listen 80;
    server_name {{domain}};
    root {{root_path}};
    index index.html index.htm;

    location / {
        try_files \\$uri \\$uri/ =404;
    }

    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)\\$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF
' && echo '✓ Static site config created at /etc/nginx/sites-available/{{domain}}'`
      },
      {
        id: "template-docker-compose-basic",
        title: "Docker Compose: Basic Template",
        tags: ["template", "docker", "compose"],
        command: `cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: node:20-alpine
    container_name: my-app
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    command: npm start
    restart: unless-stopped

  # nginx:
  #   image: nginx:alpine
  #   container_name: nginx
  #   ports:
  #     - "80:80"
  #   volumes:
  #     - ./nginx.conf:/etc/nginx/nginx.conf
  #   depends_on:
  #     - app
  #   restart: unless-stopped

networks:
  default:
    name: app-network
EOF
echo '✓ docker-compose.yml created in current directory'`
      },
      {
        id: "template-docker-compose-fullstack",
        title: "Docker Compose: Full Stack (App+DB)",
        tags: ["template", "docker", "compose"],
        command: `cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: redis
    ports:
      - "6379:6379"
    restart: unless-stopped

  app:
    image: node:20-alpine
    container_name: app
    working_dir: /app
    volumes:
      - ./:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://admin:changeme@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    command: npm start
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  default:
    name: fullstack-network
EOF
echo '✓ Full stack docker-compose.yml created'`
      },
      {
        id: "template-systemd-service",
        title: "Systemd Service Template",
        tags: ["template", "systemd", "service"],
        requires: ["service_name", "exec_start"],
        command: `sudo bash -c 'cat > /etc/systemd/system/{{service_name}}.service << \"EOF\"
[Unit]
Description={{service_name}} Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/{{service_name}}
ExecStart={{exec_start}}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier={{service_name}}

[Install]
WantedBy=multi-user.target
EOF
' && echo '✓ Systemd service created. Enable with: sudo systemctl daemon-reload && sudo systemctl enable {{service_name}} && sudo systemctl start {{service_name}}'`
      },
      {
        id: "template-gitignore-node",
        title: ".gitignore for Node.js",
        tags: ["template", "git", "nodejs"],
        command: `cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json
yarn.lock
pnpm-lock.yaml

# Environment
.env
.env.local
.env.*.local

# Build
dist/
build/
.next/
out/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Testing
coverage/
.nyc_output/

# Misc
.cache/
.temp/
EOF
echo '✓ .gitignore created for Node.js project'`
      },
      {
        id: "template-env-example",
        title: ".env.example Template",
        tags: ["template", "env", "config"],
        command: `cat > .env.example << 'EOF'
# Application
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@example.com

# AWS (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=

# API Keys (Optional)
API_KEY=
EOF
echo '✓ .env.example created'`
      },
      {
        id: "template-readme",
        title: "README.md Template",
        tags: ["template", "docs"],
        command: `cat > README.md << 'EOF'
# Project Name

Brief description of your project.

## Features

- ✅ Feature 1
- ✅ Feature 2
- ✅ Feature 3

## Prerequisites

- Node.js 20+ or Docker
- PostgreSQL (optional)
- Redis (optional)

## Installation

\\\`\\\`\\\`bash
# Clone the repository
git clone <your-repo-url>
cd <project-name>

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run the application
npm start
\\\`\\\`\\\`

## Docker Setup

\\\`\\\`\\\`bash
docker-compose up -d
\\\`\\\`\\\`

## Environment Variables

See \`.env.example\` for required environment variables.

## API Documentation

- API endpoint: \`/api\`
- Health check: \`/health\`

## License

MIT
EOF
echo '✓ README.md created'`
      },
    ],
  },
  {
    id: "performance",
    title: "Performance",
    icon: Flame,
    description: "Quick performance triage commands.",
    tasks: [
      { id: "top-cpu", title: "Top CPU", tags: ["perf"], command: "ps aux --sort=-%cpu | head -n 20" },
      { id: "top-mem", title: "Top Memory", tags: ["perf"], command: "ps aux --sort=-%mem | head -n 20" },
      { id: "iostat", title: "IOStat (if available)", tags: ["perf", "disk"], command: "iostat -xz 1 3 || true" },
      { id: "vmstat", title: "vmstat", tags: ["perf"], command: "vmstat 1 5 || true" },
      { id: "netstat", title: "Connections (summary)", tags: ["perf", "network"], command: "ss -s || netstat -s || true" },
    ],
  },
  {
    id: "keys-ssl",
    title: "Keys & TLS",
    icon: KeyRound,
    description: "TLS and key checks (read-only).",
    tasks: [
      { id: "openssl-version", title: "OpenSSL Version", tags: ["tls", "info"], command: "openssl version -a || true" },
      { id: "cert-expiry", title: "Cert Expiry (domain)", tags: ["tls", "debug"], command: "echo | openssl s_client -servername example.com -connect example.com:443 2>/dev/null | openssl x509 -noout -dates || true" },
      { id: "letsencrypt", title: "Certbot Certificates", tags: ["tls", "letsencrypt"], command: "sudo certbot certificates 2>/dev/null || true" },
    ],
  },
];

export function getDefaultGroupId() {
  return TASK_GROUPS[0]?.id || "system-info";
}

export function findGroupById(id) {
  return TASK_GROUPS.find((g) => g.id === id) || null;
}
