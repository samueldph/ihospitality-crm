#!/usr/bin/env bash
set -Eeuo pipefail

# Run as root on a fresh Ubuntu 24.04 VPS (2+ vCPU, 4+ GB RAM, 80+ GB SSD).
if [[ $EUID -ne 0 ]]; then echo 'Run with sudo: sudo bash setup-vps.sh'; exit 1; fi
if ! grep -q '24.04' /etc/os-release; then echo 'This script targets Ubuntu 24.04.'; exit 1; fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg ufw git fail2ban unattended-upgrades
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
arch=$(dpkg --print-architecture)
codename=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=$arch signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $codename stable" > /etc/apt/sources.list.d/docker.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

# Firewall: only SSH, HTTP, HTTPS. NOTE: UFW does NOT govern Docker-published
# ports — the DB/Redis/MinIO stay private only because compose does not publish
# them. Never add a `ports:` mapping to those services.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Harden SSH (key-only). Confirm a NEW ssh session works before closing this one.
cat > /etc/ssh/sshd_config.d/00-hardening.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
systemctl restart ssh

install -d -m 0750 /opt/contractor-crm
cat <<'INFO'
Host bootstrap complete. Next:
1) Point your domain's A record to this VPS public IPv4.
2) Copy the repo into /opt/contractor-crm (git clone, or CI image + compose pull).
3) cp .env.example .env ; set DOMAIN, ACME_EMAIL, APP_URL, and every secret.
4) docker compose up -d --build   (or: docker compose pull && docker compose up -d)
5) Seed the admin: ADMIN_EMAIL=... ADMIN_PASSWORD=... docker compose exec app npx prisma db seed
6) Configure off-host encrypted backups + an external uptime monitor on /api/ready.
INFO
