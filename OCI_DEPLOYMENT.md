# 🚀 EvoSense Client Web API - OCI & MySQL HeatWave Deployment Guide

This guide provides complete instructions for deploying the **EvoSense Client Web API Backend** to an **Oracle Cloud Infrastructure (OCI) Always Free AMD Micro VM** (1/8 OCPU, 1 GB RAM) with support for **OCI MySQL HeatWave Database Service**.

---

## 📌 Architecture Overview

- **Runtime**: Lightweight Node.js 22 LTS with Hono framework (`@hono/node-server`).
- **Memory Footprint**: ~35MB - 45MB RAM (Ideal for 1 GB RAM Free Tier VM).
- **Database Engine Options**:
  - **Option A**: Fully-managed **OCI MySQL HeatWave Database Service** (MDS).
  - **Option B**: Embedded Zero-Dependency SQLite (`./data/evosense.db`) or JSON persistence (`./data/app_state.json`).
- **Front-end Compatibility**: 100% unchanged API endpoints (`/api/auth/*`, `/api/devices/*`, `/api/telemetry/*`, `/api/overview`, etc.).

---

## 🚀 Quick Start: 1-Click Deployment on OCI AMD Micro VM

Run this single command on your fresh OCI Ubuntu / Oracle Linux instance:

```bash
git clone <your-repository-url> evosense-client-web-api
cd evosense-client-web-api
chmod +x setup-oci.sh
./setup-oci.sh
```

`setup-oci.sh` automatically:
1. Installs Node.js 22 LTS and build essentials.
2. Opens Port 3000 in OS firewall (`iptables` / `ufw`).
3. Installs dependencies and compiles TypeScript monorepo packages.
4. Registers and starts the `evosense-client-web-api` background `systemd` daemon.

---

## 🗄️ OCI MySQL HeatWave Database Setup

To migrate to **OCI MySQL HeatWave Database Service (MDS)**:

### 1. Provision MySQL HeatWave in OCI Console
1. Log in to the [Oracle Cloud Infrastructure Console](https://cloud.oracle.com).
2. Go to **Databases** > **MySQL HeatWave** > **DB Systems**.
3. Click **Create DB System**:
   - **Name**: `evosense-client-web-api-db`
   - **Shape**: Select HeatWave or Standalone MySQL shape.
   - **Administrator Credentials**: Username (e.g. `admin`), Password (e.g. `YourSecurePassword123!`).
   - **Networking**: Place it inside your VCN Subnet (e.g. `10.0.1.0/24`).

### 2. Configure VCN Ingress Security Rules
Ensure your VCN Security List allows TCP traffic on **Port 3306** from your Compute VM's private IP or subnet.

### 3. Set Environment Variables
Create or edit `.env` in the root of the project:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# OCI MySQL HeatWave Database Configuration
MYSQL_HOST=10.0.1.X       # Private IP of OCI MySQL HeatWave Instance
MYSQL_PORT=3306
MYSQL_USER=admin
MYSQL_PASSWORD=YourSecurePassword123!
MYSQL_DATABASE=evosensefleet
MYSQL_SSL=false           # Set to true if SSL/TLS is enforced
```

### 4. Restart Web API
```bash
sudo systemctl restart evosense-client-web-api
```

The Web API backend will automatically detect `MYSQL_HOST`, connect to HeatWave, and migrate/hydrate state into the OCI MySQL database!

---

## 🐳 Docker / Docker Compose Deployment Alternative

If you prefer containerized deployment:

```bash
# 1. Build and start container in background
docker compose up -d

# 2. Check logs
docker compose logs -f
```

---

## 🔒 Nginx Reverse Proxy & SSL (Recommended for Production)

To expose the API on Standard Port 80 / 443 with SSL:

### 1. Install Nginx & Certbot
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx Site (`/etc/nginx/sites-available/evosense`)
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Enable Site & Enable SSL
```bash
sudo ln -s /etc/nginx/sites-available/evosense /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## 🧪 API Endpoints Verification

Test the backend endpoints directly:

```bash
# 1. Health / Overview Endpoint
curl -s http://localhost:3000/api/overview

# 2. Login Endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@evosensefleet.com","password":"admin123"}'

# 3. Post Telemetry Event (IoT Device)
curl -X POST http://localhost:3000/api/telemetry/device \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"DEV-001","battery":90,"temperature":45,"speed":60}'
```

---

## 🔑 Demo Admin Credentials

- **Admin Email**: `admin@evosensefleet.com`
- **Admin Password**: `admin123`
- **Manager Email**: `manager@evosensefleet.com`
- **Manager Password**: `manager123`
- **Operator Email**: `operator@evosensefleet.com`
- **Operator Password**: `operator123`
