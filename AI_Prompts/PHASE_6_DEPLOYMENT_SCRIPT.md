# PHASE 6 — Automated Deployment Script (Ubuntu 24.04)

> **Audience:** AI coding agent (Cursor, Windsurf, Copilot Workspace, etc.)
> **Input artefacts:** The complete `smaug-ts` repository produced by Phases 1–5.
> **Output:** A single, idempotent Bash deployment script plus supporting configuration files.

---

## 0 · Context

You are working on **smaug-ts**, a port of the SMAUG 2.0 MUD engine from ~200,000 lines of C to Node.js/TypeScript. The project uses:

| Component | Technology |
|---|---|
| Runtime | Node.js LTS (22.x) |
| Language | TypeScript 5.x (strict mode, ES modules) |
| Database | PostgreSQL 16 via Prisma ORM |
| Transport | `ws` (raw WebSocket on `:4000/ws`) + Socket.IO (browser client on `:4000/play`) |
| Admin UI | React + Vite SPA served at `/admin` |
| Browser Client | React + Vite SPA served at `/play` |
| Process Manager | PM2 (production) |
| Reverse Proxy | Nginx with TLS (Let's Encrypt) |
| World Data | JSON flat files under `world/` |
| Auth | JWT + bcrypt + optional TOTP 2FA |

### Architecture Ports

| Service | Internal Port | Public Path |
|---|---|---|
| Game Engine (WebSocket) | 4000 | `wss://DOMAIN/ws` |
| Browser Play (Socket.IO) | 4000 | `https://DOMAIN/play` |
| Admin Dashboard (REST + SPA) | 4000 | `https://DOMAIN/admin`, `https://DOMAIN/api` |

### Repository

- **Public GitHub:** `https://github.com/ebrandi/smaug-ts`
- **For testing during development:** use the local Git repository (the repo above is not yet configured; the script must work with both local and remote sources).

### Target Environment

- **OS:** Ubuntu 24.04 LTS (freshly installed, standard server packages only)
- **User:** The script will be run as `root` or via `sudo`
- **Assumption:** No prior Node.js, PostgreSQL, Nginx, or Docker installation exists

---

## 1 · Cardinal Rules

These rules apply to **every file** you create or modify during this phase.

| # | Rule |
|---|---|
| 1 | **Idempotent** — The script MUST be safe to run multiple times. Every step must check whether it has already been completed before acting. Use guards like `command -v`, `dpkg -l`, `systemctl is-active`, file existence checks, etc. |
| 2 | **Bash strict mode** — Every script starts with `#!/usr/bin/env bash` followed by `set -euo pipefail`. |
| 3 | **Colour-coded output** — Use ANSI colours for status messages: green for success, yellow for warnings/skips, red for errors, cyan for info/progress headers. |
| 4 | **Logging** — All output (stdout + stderr) must be tee'd to a timestamped log file at `/var/log/smaug-deploy-YYYYMMDD-HHMMSS.log`. |
| 5 | **Non-interactive** — The script must run unattended. All `apt` calls use `-y` and `DEBIAN_FRONTEND=noninteractive`. All prompts are suppressed or pre-answered. |
| 6 | **Configurable** — All tuneable values (domain name, ports, DB credentials, backup paths, Git branch, etc.) are defined as variables at the top of the script or read from a `.env` file if present. |
| 7 | **Error handling** — Every critical step must check its exit code. On failure, print a clear error message with the failed step name and exit with a non-zero code. Use a `trap` for cleanup on unexpected exits. |
| 8 | **Comments** — Every section and non-trivial command must have a comment explaining *what* and *why*. |
| 9 | **Security first** — No passwords in plain text in the script. Generate random secrets at deploy time. File permissions must be restrictive (600 for secrets, 755 for scripts). |
| 10 | **Test with local repo** — During development and testing, the script must be testable against the local Git repository. The GitHub URL is the production default but must be overridable. |

---

## 2 · Deliverables

You must produce the following files in the repository root under a new `deploy/` directory:

```
deploy/
├── deploy.sh                  # Main deployment script
├── backup.sh                  # Backup script (called by cron)
├── restore.sh                 # Restore from backup
├── update.sh                  # Pull latest code and redeploy
├── health-check.sh            # Health check script
├── nginx/
│   └── smaug.conf.template    # Nginx site config template
├── systemd/
│   └── smaug.service          # systemd unit file (alternative to PM2)
├── .env.production.example    # Example production .env
└── README-DEPLOY.md           # Deployment documentation
```

---

## 3 · `deploy.sh` — Main Deployment Script

### 3.1 Script Header

```bash
#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# SMAUG 2.0 TypeScript — Automated Deployment Script
# Target: Ubuntu 24.04 LTS (fresh install)
# Repository: https://github.com/ebrandi/smaug-ts
# ============================================================

# --- Configuration (override via .env or environment) ---
SMAUG_DOMAIN="${SMAUG_DOMAIN:-mud.example.com}"
SMAUG_PORT="${SMAUG_PORT:-4000}"
SMAUG_USER="${SMAUG_USER:-smaug}"
SMAUG_HOME="${SMAUG_HOME:-/opt/smaug-ts}"
SMAUG_REPO="${SMAUG_REPO:-https://github.com/ebrandi/smaug-ts.git}"
SMAUG_BRANCH="${SMAUG_BRANCH:-main}"
SMAUG_DB_NAME="${SMAUG_DB_NAME:-smaug}"
SMAUG_DB_USER="${SMAUG_DB_USER:-smaug}"
SMAUG_DB_PASS="${SMAUG_DB_PASS:-}"          # Auto-generated if empty
SMAUG_JWT_SECRET="${SMAUG_JWT_SECRET:-}"     # Auto-generated if empty
SMAUG_BACKUP_DIR="${SMAUG_BACKUP_DIR:-/var/backups/smaug}"
SMAUG_BACKUP_RETENTION_DAYS="${SMAUG_BACKUP_RETENTION_DAYS:-30}"
SMAUG_ENABLE_TLS="${SMAUG_ENABLE_TLS:-true}"
SMAUG_ADMIN_EMAIL="${SMAUG_ADMIN_EMAIL:-admin@example.com}"
SMAUG_USE_PM2="${SMAUG_USE_PM2:-true}"       # false = use systemd
NODE_MAJOR="${NODE_MAJOR:-22}"
LOG_FILE="/var/log/smaug-deploy-$(date +%Y%m%d-%H%M%S).log"
```

### 3.2 Required Sections (in execution order)

The script must implement the following sections, each as a clearly labelled function:

#### 3.2.1 `preflight_checks()`
- Verify running as root or with sudo
- Verify Ubuntu 24.04 (`lsb_release -rs` == `24.04`)
- Verify minimum hardware: ≥1 GB RAM, ≥10 GB free disk
- Verify internet connectivity (`curl -sf https://deb.nodesource.com > /dev/null`)
- Load `.env` file from current directory if it exists (source it)
- Generate random secrets for `SMAUG_DB_PASS` and `SMAUG_JWT_SECRET` if not set (use `openssl rand -base64 32`)

#### 3.2.2 `install_system_packages()`
- `apt update && apt upgrade -y`
- Install essential packages: `curl`, `wget`, `git`, `build-essential`, `ca-certificates`, `gnupg`, `lsb-release`, `software-properties-common`, `unzip`, `jq`, `htop`, `tmux`, `logrotate`
- Install Node.js 22.x LTS from NodeSource official repository
  - Add NodeSource GPG key and repository
  - `apt install -y nodejs`
  - Verify: `node --version` and `npm --version`
- Install PostgreSQL 16 from official PostgreSQL APT repository
  - Add PostgreSQL GPG key and repository
  - `apt install -y postgresql-16 postgresql-client-16`
  - Enable and start the service
  - Verify: `pg_isready`
- Install Nginx from official Ubuntu repository
  - `apt install -y nginx`
  - Enable and start the service
- Install Certbot (for Let's Encrypt TLS) if `SMAUG_ENABLE_TLS=true`
  - `apt install -y certbot python3-certbot-nginx`
- Install PM2 globally if `SMAUG_USE_PM2=true`
  - `npm install -g pm2`
  - `pm2 startup systemd -u ${SMAUG_USER} --hp /home/${SMAUG_USER}` (or `${SMAUG_HOME}`)

#### 3.2.3 `create_system_user()`
- Create a dedicated `smaug` system user (no login shell, home at `${SMAUG_HOME}`)
  - `useradd --system --create-home --home-dir ${SMAUG_HOME} --shell /usr/sbin/nologin ${SMAUG_USER}`
- Skip if user already exists
- Create required directories:
  - `${SMAUG_HOME}` (application root)
  - `${SMAUG_BACKUP_DIR}` (backups)
  - `/var/log/smaug` (application logs)
- Set ownership: `chown -R ${SMAUG_USER}:${SMAUG_USER}` on all three

#### 3.2.4 `setup_postgresql()`
- Create PostgreSQL role `${SMAUG_DB_USER}` with password `${SMAUG_DB_PASS}` (skip if exists)
  - `sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${SMAUG_DB_USER}'" | grep -q 1 || ...`
- Create database `${SMAUG_DB_NAME}` owned by `${SMAUG_DB_USER}` (skip if exists)
- Grant all privileges on the database to the role
- Configure `pg_hba.conf` to allow local MD5 authentication for the smaug user
  - Add line: `local ${SMAUG_DB_NAME} ${SMAUG_DB_USER} md5`
  - Reload PostgreSQL: `systemctl reload postgresql`
- Verify connectivity: `PGPASSWORD=${SMAUG_DB_PASS} psql -U ${SMAUG_DB_USER} -d ${SMAUG_DB_NAME} -c "SELECT 1;"`

#### 3.2.5 `clone_and_build()`
- Clone the repository into `${SMAUG_HOME}` (or pull if already cloned)
  - If `${SMAUG_HOME}/.git` exists: `git -C ${SMAUG_HOME} fetch && git -C ${SMAUG_HOME} checkout ${SMAUG_BRANCH} && git -C ${SMAUG_HOME} pull`
  - Else: `git clone --branch ${SMAUG_BRANCH} ${SMAUG_REPO} ${SMAUG_HOME}`
- Generate the `.env` file at `${SMAUG_HOME}/.env` with production values:
  ```
  NODE_ENV=production
  PORT=${SMAUG_PORT}
  DATABASE_URL=postgresql://${SMAUG_DB_USER}:${SMAUG_DB_PASS}@localhost:5432/${SMAUG_DB_NAME}
  JWT_SECRET=${SMAUG_JWT_SECRET}
  ADMIN_TRUST_LEVEL=60
  LOG_LEVEL=info
  LOG_DIR=/var/log/smaug
  WORLD_DIR=${SMAUG_HOME}/world
  WS_PATH=/ws
  SOCKETIO_PATH=/play
  MAX_CONNECTIONS=200
  IDLE_TIMEOUT_SEC=600
  PULSE_INTERVAL_MS=250
  TICK_SECONDS=70
  VIOLENCE_SECONDS=3
  MOBILE_SECONDS=4
  AREA_RESET_MINUTES=15
  BCRYPT_SALT_ROUNDS=12
  ```
- Set file permissions: `chmod 600 ${SMAUG_HOME}/.env`
- Install dependencies: `cd ${SMAUG_HOME} && npm ci --production=false` (need devDeps for build)
- Run Prisma migrations: `npx prisma migrate deploy`
- Run Prisma client generation: `npx prisma generate`
- Build TypeScript: `npm run build`
- Build Admin Dashboard: `cd ${SMAUG_HOME}/src/dashboard && npm ci && npm run build`
- Build Browser Client: `cd ${SMAUG_HOME}/src/client && npm ci && npm run build`
- Seed world data if needed: `npm run seed` (only if `world/` directory has data and DB is empty)
- Set ownership: `chown -R ${SMAUG_USER}:${SMAUG_USER} ${SMAUG_HOME}`

#### 3.2.6 `configure_nginx()`
- Generate Nginx site configuration from template (`deploy/nginx/smaug.conf.template`)
- The template must handle:
  - HTTP → HTTPS redirect (if TLS enabled)
  - WebSocket upgrade for `/ws` path (proxy to `localhost:${SMAUG_PORT}`)
  - Socket.IO upgrade for `/play` path (proxy to `localhost:${SMAUG_PORT}`)
  - Reverse proxy for `/api` and `/admin` paths (proxy to `localhost:${SMAUG_PORT}`)
  - Static file serving for dashboard and client builds (with cache headers)
  - Security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy`
  - Rate limiting for API endpoints (`limit_req_zone`)
  - Connection limits for WebSocket endpoints (`limit_conn_zone`)
  - Gzip compression for text/JSON/JS/CSS
  - Access and error log paths under `/var/log/nginx/smaug-*.log`
- Install the config: `cp` to `/etc/nginx/sites-available/smaug`, symlink to `sites-enabled/`, remove `default` site
- Test config: `nginx -t`
- If TLS enabled:
  - Run Certbot: `certbot --nginx -d ${SMAUG_DOMAIN} --non-interactive --agree-tos -m ${SMAUG_ADMIN_EMAIL}`
  - Verify auto-renewal: `certbot renew --dry-run`
- Reload Nginx: `systemctl reload nginx`

#### 3.2.7 `configure_process_manager()`

**If PM2 (`SMAUG_USE_PM2=true`):**
- Create PM2 ecosystem file at `${SMAUG_HOME}/ecosystem.config.cjs`:
  ```javascript
  module.exports = {
    apps: [{
      name: 'smaug-ts',
      script: './dist/main.js',
      cwd: '${SMAUG_HOME}',
      instances: 1,                    // Single-threaded game loop — must be 1
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '1G',
      log_file: '/var/log/smaug/pm2-combined.log',
      out_file: '/var/log/smaug/pm2-out.log',
      error_file: '/var/log/smaug/pm2-error.log',
      merge_logs: true,
      time: true,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
    }]
  };
  ```
- Start the application: `sudo -u ${SMAUG_USER} pm2 start ${SMAUG_HOME}/ecosystem.config.cjs`
- Save PM2 process list: `sudo -u ${SMAUG_USER} pm2 save`
- Configure PM2 startup: `pm2 startup systemd -u ${SMAUG_USER} --hp ${SMAUG_HOME}`

**If systemd (`SMAUG_USE_PM2=false`):**
- Install the systemd unit file from `deploy/systemd/smaug.service` to `/etc/systemd/system/smaug.service`
- The unit file must include:
  - `User=${SMAUG_USER}`, `Group=${SMAUG_USER}`
  - `WorkingDirectory=${SMAUG_HOME}`
  - `ExecStart=/usr/bin/node dist/main.js`
  - `EnvironmentFile=${SMAUG_HOME}/.env`
  - `Restart=always`, `RestartSec=5`
  - `StandardOutput=append:/var/log/smaug/smaug.log`
  - `StandardError=append:/var/log/smaug/smaug-error.log`
  - `LimitNOFILE=65535`
  - Security hardening: `ProtectSystem=strict`, `ProtectHome=true`, `NoNewPrivileges=true`, `PrivateTmp=true`, `ReadWritePaths=/var/log/smaug ${SMAUG_HOME}/world`
- `systemctl daemon-reload && systemctl enable smaug && systemctl start smaug`

#### 3.2.8 `harden_server()`

This section implements security hardening for the server.

**UFW Firewall:**
- Reset UFW to defaults: `ufw --force reset`
- Default policies: `ufw default deny incoming`, `ufw default allow outgoing`
- Allow SSH: `ufw allow 22/tcp comment 'SSH'`
- Allow HTTP: `ufw allow 80/tcp comment 'HTTP'`
- Allow HTTPS: `ufw allow 443/tcp comment 'HTTPS'`
- Do NOT expose port 4000 directly (Nginx proxies all traffic)
- Enable UFW: `ufw --force enable`
- Verify: `ufw status verbose`

**SSH Hardening:**
- Backup existing `sshd_config`
- Apply hardening (only if not already applied — check for a sentinel comment):
  - `PermitRootLogin prohibit-password` (allow key-based root login for initial setup)
  - `PasswordAuthentication no` (only if SSH keys are detected in `~/.ssh/authorized_keys`)
  - `MaxAuthTries 3`
  - `ClientAliveInterval 300`
  - `ClientAliveCountMax 2`
  - `X11Forwarding no`
  - `AllowTcpForwarding no`
  - `Protocol 2`
- Test config: `sshd -t`
- Reload: `systemctl reload sshd`

**Fail2Ban:**
- Install: `apt install -y fail2ban`
- Create `/etc/fail2ban/jail.local` with:
  - SSH jail enabled (maxretry=3, bantime=3600)
  - Nginx HTTP auth jail enabled
  - Nginx bad bots jail enabled
- Enable and start: `systemctl enable fail2ban && systemctl start fail2ban`

**Kernel Hardening (sysctl):**
- Create `/etc/sysctl.d/99-smaug-hardening.conf`:
  ```
  # Disable IP forwarding
  net.ipv4.ip_forward = 0
  # Enable SYN flood protection
  net.ipv4.tcp_syncookies = 1
  # Disable source routing
  net.ipv4.conf.all.accept_source_route = 0
  net.ipv4.conf.default.accept_source_route = 0
  # Disable ICMP redirects
  net.ipv4.conf.all.accept_redirects = 0
  net.ipv4.conf.default.accept_redirects = 0
  net.ipv4.conf.all.send_redirects = 0
  # Enable IP spoofing protection
  net.ipv4.conf.all.rp_filter = 1
  net.ipv4.conf.default.rp_filter = 1
  # Log suspicious packets
  net.ipv4.conf.all.log_martians = 1
  # Disable IPv6 if not needed
  net.ipv6.conf.all.disable_ipv6 = 1
  net.ipv6.conf.default.disable_ipv6 = 1
  ```
- Apply: `sysctl --system`

**Automatic Security Updates:**
- Install: `apt install -y unattended-upgrades apt-listchanges`
- Enable: `dpkg-reconfigure -plow unattended-upgrades` (non-interactive)
- Configure `/etc/apt/apt.conf.d/50unattended-upgrades` to enable security updates only

**File Permissions Audit:**
- Ensure `${SMAUG_HOME}/.env` is `600` owned by `${SMAUG_USER}`
- Ensure `${SMAUG_HOME}` is `750` owned by `${SMAUG_USER}`
- Ensure `/var/log/smaug` is `750` owned by `${SMAUG_USER}`
- Ensure backup directory is `700` owned by `${SMAUG_USER}`

#### 3.2.9 `setup_backups()`
- Create the backup directory: `mkdir -p ${SMAUG_BACKUP_DIR}`
- Install `deploy/backup.sh` to `${SMAUG_HOME}/deploy/backup.sh`, make executable
- Install cron job for the `${SMAUG_USER}` user:
  - Daily full backup at 03:00: `0 3 * * * ${SMAUG_HOME}/deploy/backup.sh full`
  - Hourly database-only backup: `0 * * * * ${SMAUG_HOME}/deploy/backup.sh db`
- Verify cron is installed: `crontab -u ${SMAUG_USER} -l`

#### 3.2.10 `setup_log_rotation()`
- Create `/etc/logrotate.d/smaug`:
  ```
  /var/log/smaug/*.log {
      daily
      missingok
      rotate 14
      compress
      delaycompress
      notifempty
      create 0640 smaug smaug
      sharedscripts
      postrotate
          # Signal PM2 or systemd to reopen log files
          [ -f /run/smaug.pid ] && kill -USR1 $(cat /run/smaug.pid) || true
      endscript
  }
  ```

#### 3.2.11 `verify_deployment()`
- Wait for the application to start (poll health endpoint for up to 30 seconds)
- Check that the game server process is running (`pm2 status` or `systemctl is-active smaug`)
- Check that PostgreSQL is accepting connections
- Check that Nginx is running and responding on port 80/443
- Check that the WebSocket endpoint is reachable: `curl -sf -o /dev/null -w "%{http_code}" http://localhost:${SMAUG_PORT}/`
- Check that UFW is active with correct rules
- Check that the backup cron job is installed
- Print a summary of all checks (pass/fail) with colour coding
- Print connection information:
  ```
  ═══════════════════════════════════════════════════
   SMAUG 2.0 TypeScript — Deployment Complete!
  ═══════════════════════════════════════════════════
   Web Play:    https://${SMAUG_DOMAIN}/play
   Admin Panel: https://${SMAUG_DOMAIN}/admin
   WebSocket:   wss://${SMAUG_DOMAIN}/ws

   MUD Client:  Connect to ${SMAUG_DOMAIN} port 443
                 (WebSocket mode in Mudlet/TinTin++)

   Logs:        /var/log/smaug/
   Backups:     ${SMAUG_BACKUP_DIR}/
   Config:      ${SMAUG_HOME}/.env
  ═══════════════════════════════════════════════════
  ```

#### 3.2.12 `main()`
- Call all functions in order
- Wrap in a timing block to report total deployment time
- Exit 0 on success

---

## 4 · `backup.sh` — Backup Script

### 4.1 Requirements

- Accepts one argument: `full` or `db`
- **`db` mode:**
  - Dump PostgreSQL database using `pg_dump` with custom format (`-Fc`)
  - Output: `${SMAUG_BACKUP_DIR}/db/smaug-db-YYYYMMDD-HHMMSS.dump`
- **`full` mode:**
  - Everything in `db` mode, plus:
  - Archive world data: `tar czf ${SMAUG_BACKUP_DIR}/world/smaug-world-YYYYMMDD-HHMMSS.tar.gz ${SMAUG_HOME}/world/`
  - Archive configuration: `tar czf ${SMAUG_BACKUP_DIR}/config/smaug-config-YYYYMMDD-HHMMSS.tar.gz ${SMAUG_HOME}/.env ${SMAUG_HOME}/ecosystem.config.cjs ${SMAUG_HOME}/prisma/`
  - Archive logs: `tar czf ${SMAUG_BACKUP_DIR}/logs/smaug-logs-YYYYMMDD-HHMMSS.tar.gz /var/log/smaug/`
- **Retention:** Delete backups older than `${SMAUG_BACKUP_RETENTION_DAYS}` days (use `find -mtime +N -delete`)
- **Verification:** After each backup, verify the file exists and is non-empty
- **Logging:** Append to `/var/log/smaug/backup.log` with timestamps
- **Exit codes:** 0 on success, 1 on failure

---

## 5 · `restore.sh` — Restore Script

### 5.1 Requirements

- Interactive: lists available backups and lets the operator choose
- Accepts optional arguments: `--db <dump_file>` and/or `--world <tar_file>` and/or `--config <tar_file>`
- **Database restore:**
  - Stop the game server (PM2 or systemd)
  - Drop and recreate the database
  - Restore from dump: `pg_restore -U ${SMAUG_DB_USER} -d ${SMAUG_DB_NAME} <dump_file>`
  - Run Prisma migrations to ensure schema is current: `npx prisma migrate deploy`
  - Start the game server
- **World restore:**
  - Stop the game server
  - Extract world archive to `${SMAUG_HOME}/world/` (with backup of current world data first)
  - Start the game server
- **Config restore:**
  - Extract config archive (with backup of current config first)
  - Restart the game server
- **Safety:** Always create a backup of current state before restoring
- **Confirmation:** Require explicit `--yes` flag or interactive confirmation before destructive operations

---

## 6 · `update.sh` — Update Script

### 6.1 Requirements

- Pull latest code from the configured branch
- Run `npm ci` to update dependencies
- Run `npx prisma migrate deploy` for any new migrations
- Run `npx prisma generate` to regenerate the client
- Run `npm run build` to rebuild TypeScript
- Rebuild dashboard and client if their source changed (check git diff)
- Create a pre-update backup (call `backup.sh full`)
- Gracefully restart the game server:
  - If PM2: `pm2 reload smaug-ts` (zero-downtime reload)
  - If systemd: `systemctl restart smaug`
- Run health check after restart
- On failure: offer to rollback to the pre-update backup
- **Flags:**
  - `--no-backup` — skip pre-update backup
  - `--force` — skip confirmation prompts
  - `--branch <name>` — override the branch to pull

---

## 7 · `health-check.sh` — Health Check Script

### 7.1 Requirements

- Check all critical services and report status:
  - Node.js game server process (running, memory usage, uptime)
  - PostgreSQL (accepting connections, database exists)
  - Nginx (running, config valid)
  - UFW (active, correct rules)
  - Disk space (warn if <20% free)
  - Memory usage (warn if <15% free)
  - SSL certificate expiry (warn if <14 days)
  - Backup freshness (warn if last backup >25 hours old)
  - Log file sizes (warn if any >500MB)
  - Game server responsiveness (HTTP health endpoint responds within 5s)
- Output: colour-coded table with service name, status, and details
- Exit code: 0 if all OK, 1 if any warnings, 2 if any critical failures
- Suitable for use with monitoring systems (Nagios, Zabbix, etc.)

---

## 8 · `nginx/smaug.conf.template` — Nginx Configuration

### 8.1 Template Variables

The template uses `${SMAUG_DOMAIN}`, `${SMAUG_PORT}`, and other variables that are substituted by `deploy.sh` using `envsubst`.

### 8.2 Required Configuration Blocks

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=ws:10m;

# Upstream
upstream smaug_backend {
    server 127.0.0.1:${SMAUG_PORT};
    keepalive 32;
}

server {
    listen 80;
    server_name ${SMAUG_DOMAIN};
    # Redirect to HTTPS (if TLS enabled) or serve directly
    ...
}

server {
    listen 443 ssl http2;
    server_name ${SMAUG_DOMAIN};

    # TLS (managed by Certbot)
    ssl_certificate     /etc/letsencrypt/live/${SMAUG_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SMAUG_DOMAIN}/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss://${SMAUG_DOMAIN}; style-src 'self' 'unsafe-inline'; script-src 'self'" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;

    # WebSocket — raw WS for MUD clients
    location /ws {
        proxy_pass http://smaug_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        limit_conn ws 5;    # Max 5 WS connections per IP
    }

    # Socket.IO — browser play client
    location /play {
        proxy_pass http://smaug_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        limit_conn ws 5;
    }

    # REST API
    location /api {
        proxy_pass http://smaug_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        limit_req zone=api burst=20 nodelay;
    }

    # Admin Dashboard (static files)
    location /admin {
        alias ${SMAUG_HOME}/src/dashboard/dist;
        try_files $uri $uri/ /admin/index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Browser Client (static files — served at root or /client)
    location / {
        alias ${SMAUG_HOME}/src/client/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Deny access to sensitive files
    location ~ /\. { deny all; }
    location ~ \.env$ { deny all; }
}
```

---

## 9 · `systemd/smaug.service` — systemd Unit File

```ini
[Unit]
Description=SMAUG 2.0 TypeScript MUD Server
Documentation=https://github.com/ebrandi/smaug-ts
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=smaug
Group=smaug
WorkingDirectory=/opt/smaug-ts
ExecStart=/usr/bin/node dist/main.js
EnvironmentFile=/opt/smaug-ts/.env
Restart=always
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

# Logging
StandardOutput=append:/var/log/smaug/smaug.log
StandardError=append:/var/log/smaug/smaug-error.log

# Resource limits
LimitNOFILE=65535
MemoryMax=1G

# Security hardening
ProtectSystem=strict
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
ReadWritePaths=/var/log/smaug /opt/smaug-ts/world

[Install]
WantedBy=multi-user.target
```

---

## 10 · `.env.production.example`

```bash
# ============================================================
# SMAUG 2.0 TypeScript — Production Environment Variables
# Copy to .env and fill in your values
# ============================================================

# --- Server ---
NODE_ENV=production
PORT=4000

# --- Database ---
DATABASE_URL=postgresql://smaug:CHANGE_ME@localhost:5432/smaug

# --- Authentication ---
JWT_SECRET=CHANGE_ME_TO_RANDOM_64_CHAR_STRING
BCRYPT_SALT_ROUNDS=12
# TOTP_ISSUER=SmaugMUD    # Uncomment to enable 2FA

# --- Admin ---
ADMIN_TRUST_LEVEL=60

# --- Logging ---
LOG_LEVEL=info
LOG_DIR=/var/log/smaug

# --- World ---
WORLD_DIR=/opt/smaug-ts/world

# --- Network ---
WS_PATH=/ws
SOCKETIO_PATH=/play
MAX_CONNECTIONS=200
IDLE_TIMEOUT_SEC=600

# --- Game Timing ---
PULSE_INTERVAL_MS=250
TICK_SECONDS=70
VIOLENCE_SECONDS=3
MOBILE_SECONDS=4
AREA_RESET_MINUTES=15

# --- Backups ---
BACKUP_DIR=/var/backups/smaug
BACKUP_RETENTION_DAYS=30

# --- TLS (managed by Certbot, referenced by Nginx) ---
# DOMAIN=mud.example.com
# ADMIN_EMAIL=admin@example.com
```

---

## 11 · `README-DEPLOY.md` — Deployment Documentation

This file must cover:

### 11.1 Quick Start
- One-command deployment: `sudo bash deploy/deploy.sh`
- Pre-deployment checklist (domain DNS, SSH keys, etc.)

### 11.2 Prerequisites
- Ubuntu 24.04 LTS (fresh install)
- Minimum hardware: 1 CPU, 1 GB RAM, 10 GB disk (recommended: 2 CPU, 2 GB RAM, 20 GB disk)
- A registered domain name pointing to the server's IP (for TLS)
- SSH access with key-based authentication

### 11.3 Configuration
- How to customise deployment via environment variables or `.env` file
- Full reference table of all `SMAUG_*` variables with descriptions and defaults

### 11.4 Post-Deployment
- How to verify the deployment (`health-check.sh`)
- How to create the first admin account (connect via browser, create character, then use `deploy/promote-admin.sh <name>` or direct SQL)
- How to import legacy `.are` files
- How to connect with a MUD client (Mudlet, TinTin++)

### 11.5 Day-to-Day Operations
- Viewing logs: `pm2 logs` or `journalctl -u smaug`
- Restarting: `pm2 restart smaug-ts` or `systemctl restart smaug`
- Updating: `bash deploy/update.sh`
- Manual backup: `bash deploy/backup.sh full`
- Restoring from backup: `bash deploy/restore.sh`

### 11.6 Security
- UFW rules explained
- SSH hardening applied
- Fail2Ban configuration
- How to rotate secrets (JWT, DB password)
- How to update TLS certificates manually
- How to review security logs

### 11.7 Troubleshooting
- Common issues and solutions (port conflicts, DB connection failures, Nginx 502, WebSocket timeouts, etc.)
- How to check each service independently
- How to run the game server in foreground for debugging

### 11.8 Uninstalling
- Steps to completely remove the deployment

---

## 12 · Testing Requirements

### 12.1 Local Testing Strategy

Since the GitHub repository is not yet configured, all testing must use the local Git repository:

1. **Set `SMAUG_REPO` to the local path** — e.g., `SMAUG_REPO=/home/user/smaug-ts`
2. **The script must handle `file://` and local path repos** — `git clone` works with local paths
3. **Test in a clean Ubuntu 24.04 VM or container** — Use Vagrant, LXD, or Docker to simulate a fresh install
4. **Test idempotency** — Run `deploy.sh` twice; the second run must complete without errors
5. **Test each script independently:**
   - `backup.sh full` → verify backup files exist
   - `backup.sh db` → verify DB dump exists
   - `restore.sh --db <latest_dump> --yes` → verify DB restored
   - `update.sh --no-backup --force` → verify code updated and server restarted
   - `health-check.sh` → verify all checks pass

### 12.2 Validation Checklist

After running `deploy.sh`, the following must be true:

- [ ] Node.js 22.x is installed and on PATH
- [ ] PostgreSQL 16 is running and the `smaug` database exists
- [ ] Nginx is running with the correct site configuration
- [ ] UFW is active with rules for SSH (22), HTTP (80), HTTPS (443) only
- [ ] The `smaug` system user exists with correct home directory
- [ ] The repository is cloned to `${SMAUG_HOME}`
- [ ] `npm ci` completed successfully
- [ ] Prisma migrations applied
- [ ] TypeScript build completed (`dist/` directory exists)
- [ ] Dashboard build completed (`src/dashboard/dist/` exists)
- [ ] Client build completed (`src/client/dist/` exists)
- [ ] `.env` file exists with correct values and `600` permissions
- [ ] Game server is running (PM2 or systemd)
- [ ] Health check endpoint responds
- [ ] Fail2Ban is running with SSH jail active
- [ ] Automatic security updates are enabled
- [ ] Log rotation is configured
- [ ] Backup cron jobs are installed
- [ ] SSL certificate is valid (if TLS enabled)
- [ ] WebSocket connections work through Nginx
- [ ] Socket.IO connections work through Nginx
- [ ] Admin dashboard is accessible at `/admin`
- [ ] Browser client is accessible at root `/`

---

## 13 · Acceptance Criteria

The phase is complete when **all** of the following are true:

- [ ] `deploy/deploy.sh` runs to completion on a fresh Ubuntu 24.04 server
- [ ] `deploy/deploy.sh` is idempotent (second run completes without errors)
- [ ] `deploy/backup.sh full` creates valid backup archives
- [ ] `deploy/backup.sh db` creates a valid database dump
- [ ] `deploy/restore.sh` successfully restores from backup
- [ ] `deploy/update.sh` pulls code, rebuilds, and restarts without downtime (PM2) or with minimal downtime (systemd)
- [ ] `deploy/health-check.sh` reports all services healthy
- [ ] UFW blocks all ports except 22, 80, 443
- [ ] Fail2Ban is active and protecting SSH
- [ ] Nginx correctly proxies WebSocket, Socket.IO, REST API, and serves static files
- [ ] TLS is configured and working (if enabled)
- [ ] All scripts follow bash strict mode and are well-commented
- [ ] All scripts produce colour-coded output and log to files
- [ ] `deploy/README-DEPLOY.md` is comprehensive and accurate
- [ ] `.env.production.example` documents all environment variables
- [ ] The deployment can be tested against the local Git repository
