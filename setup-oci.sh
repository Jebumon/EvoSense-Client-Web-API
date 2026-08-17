#!/usr/bin/env bash
set -e

echo "================================================================="
echo "🚀 EvoSenseFleet Web API - OCI AMD Micro VM Setup & Deployment"
echo "================================================================="

# 1. Update OS and install Node.js 22 LTS
echo "📦 [1/5] Updating OS packages and installing Node.js 22 LTS..."
sudo apt-get update -y
sudo apt-get install -y curl build-essential git

if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 22 ]]; then
  echo "📥 Installing Node.js 22 LTS via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ npm version: $(npm -v)"

# 2. Configure Firewall (iptables / ufw) to open Port 3000
echo "🛡️ [2/5] Configuring OS Firewall to open port 3000..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 3000/tcp || true
fi

# OCI Ubuntu images use iptables directly
if command -v iptables &> /dev/null; then
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT || true
  if command -v netfilter-persistent &> /dev/null; then
    sudo netfilter-persistent save || true
  fi
fi

# 3. Install NPM Dependencies & Build Monorepo
echo "🔨 [3/5] Installing project dependencies & building Web API..."
npm install
npm run build

# 4. Install & Enable Systemd Service
echo "⚙️ [4/5] Setting up systemd service..."
APP_DIR=$(pwd)
USER_NAME=$(whoami)

sudo cp evosensefleet-api.service /etc/systemd/system/evosensefleet-api.service
sudo sed -i "s|/opt/evosensefleet-api|${APP_DIR}|g" /etc/systemd/system/evosensefleet-api.service
sudo sed -i "s|User=ubuntu|User=${USER_NAME}|g" /etc/systemd/system/evosensefleet-api.service
sudo sed -i "s|/usr/bin/node|$(which node)|g" /etc/systemd/system/evosensefleet-api.service

sudo systemctl daemon-reload
sudo systemctl enable evosensefleet-api
sudo systemctl restart evosensefleet-api

# 5. Check Service Status
echo "📊 [5/5] Verifying Web API service status..."
sleep 2

if sudo systemctl is-active --quiet evosensefleet-api; then
  echo "================================================================="
  echo "🎉 SUCCESS! EvoSenseFleet Web API is running on OCI VM."
  echo "📡 Server Port: 3000"
  echo "🌐 Test API Health: curl http://localhost:3000/api/overview"
  echo "📋 View Logs: sudo journalctl -u evosensefleet-api -f"
  echo "================================================================="
else
  echo "⚠️ Warning: Service did not start cleanly. Check logs with:"
  echo "   sudo journalctl -u evosensefleet-api --no-pager -n 50"
fi
