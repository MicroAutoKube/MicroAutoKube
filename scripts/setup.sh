#!/bin/bash

# ─────────────────────────────────────────────
# 🎨 Colors
# ─────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────
# 🧯 Error Handlers
# ─────────────────────────────────────────────
cleanup() {
    echo -e "\n${RED}⚠️  Setup interrupted! Cleaning up...${NC}"
    exit 1
}

fail_if_error() {
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

trap cleanup SIGINT

# ─────────────────────────────────────────────
# 🧠 Input Prompts
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 CONFIGURATION${NC}"
read -p "🚀 Enter the application name (default: autokube): " APP_NAME
APP_NAME=${APP_NAME:-autokube}

read -p "👤 Enter the system user to run the application (default: tester): " APP_USER
APP_USER=${APP_USER:-tester}

echo -e "${YELLOW}📦 Select a package manager:${NC}"
echo "1) bun"
echo "2) npm"
echo "3) pnpm"
read -p "Enter choice (default: bun): " PKG_MANAGER_CHOICE
case "$PKG_MANAGER_CHOICE" in
    2) PKG_MANAGER="npm";;
    3) PKG_MANAGER="pnpm";;
    *) PKG_MANAGER="bun";;
esac

read -p "🌍 Enter your domain (leave blank for localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

if [[ "$DOMAIN" != "localhost" ]]; then
    read -p "📧 Enter your email for SSL certificate: " EMAIL
else
    EMAIL="none"
fi

# ─────────────────────────────────────────────
# 🔐 Secrets & Paths
# ─────────────────────────────────────────────
APP_DIR="$HOME/autokube"
BUN_INSTALL_DIR="/home/$APP_USER/.bun"
BUN_PATH="$BUN_INSTALL_DIR/bin/bun"
SERVER_IP=$(hostname -I | awk '{print $1}')

DB_PASSWORD=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
INTERNAL_API_TOKEN=$(openssl rand -hex 32)

# ─────────────────────────────────────────────
# 🔄 System Dependencies
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 1: Installing System Dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip postgresql postgresql-contrib nginx certbot python3-certbot-nginx openssl git build-essential python3.12 python3.12-venv python3-pip sshpass
fail_if_error "System package installation failed"

# ─────────────────────────────────────────────
# 📦 Node + Package Manager
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 2: Setting Up Node.js and $PKG_MANAGER...${NC}"
sudo -u $APP_USER bash -c '
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
fi
. "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
'

if [[ "$PKG_MANAGER" == "bun" ]]; then
    sudo -u $APP_USER bash -c "command -v bun || (curl -fsSL https://bun.sh/install | bash)"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    sudo -u $APP_USER bash -c "npm install -g pnpm --location=global"
fi

# ─────────────────────────────────────────────
# 👤 System User
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 3: Creating/Using System User...${NC}"
if id "$APP_USER" &>/dev/null; then
    echo -e "${GREEN}✅ User $APP_USER already exists.${NC}"
else
    sudo useradd -m -r -s /bin/bash $APP_USER
    sudo usermod -aG sudo $APP_USER
    echo -e "${GREEN}✅ User $APP_USER created.${NC}"
fi

# ─────────────────────────────────────────────
# 🐘 PostgreSQL
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 4: Configuring PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$APP_NAME'")
if [[ "$DB_EXISTS" != "1" ]]; then
    sudo -u postgres psql -c "CREATE DATABASE $APP_NAME;"
fi

USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP_NAME'")
if [[ "$USER_EXISTS" != "1" ]]; then
    sudo -u postgres psql -c "CREATE USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
fi

sudo -u postgres psql -c "ALTER USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "ALTER USER $APP_NAME CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME <<SQL
GRANT USAGE, CREATE ON SCHEMA public TO $APP_NAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $APP_NAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $APP_NAME;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $APP_NAME;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $APP_NAME;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $APP_NAME;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $APP_NAME;
ALTER SCHEMA public OWNER TO $APP_NAME;
SQL

sudo systemctl restart postgresql

# ─────────────────────────────────────────────
# 🧾 Clone Repo
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 5: Cloning Repository...${NC}"
if [[ -d "$APP_DIR" ]]; then
    echo -e "${YELLOW}🔄 Repo exists. Pulling latest changes...${NC}"
    sudo -u $APP_USER bash -c "cd $APP_DIR && git reset --hard && git pull origin main"
else
    sudo -u $APP_USER bash -c "git clone https://github.com/MicroAutoKube/MicroAutoKube $APP_DIR"
fi
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# ─────────────────────────────────────────────
# 📦 Install JS Dependencies
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 6: Installing Node.js Dependencies...${NC}"
sudo -u $APP_USER bash -c "
export NVM_DIR=\"\$HOME/.nvm\"
. \"\$NVM_DIR/nvm.sh\"
nvm use 22
cd $APP_DIR/dashboard-autokube && $PKG_MANAGER install
"
fail_if_error "Dependency installation failed"


# ─────────────────────────────────────────────
# 🔐 .env File
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 7: Creating .env File...${NC}"
sudo -u $APP_USER bash -c "cat > $APP_DIR/dashboard-autokube/.env" <<EOF
DATABASE_URL=postgresql://$APP_NAME:$DB_PASSWORD@localhost:5432/$APP_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://${DOMAIN}:3000
NODE_ENV=production
ENCRYPTION_KEY=$ENCRYPTION_KEY
INTERNAL_API_TOKEN=$INTERNAL_API_TOKEN
SERVER_IP=$SERVER_IP
EOF

# ─────────────────────────────────────────────
# 🧬 Prisma Migration
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 8: Running Prisma Migrations...${NC}"
if [[ "$PKG_MANAGER" == "npm" ]]; then
    PRISMA_CMD="npx prisma migrate dev"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    PRISMA_CMD="pnpx prisma migrate dev"
else
    PRISMA_CMD="bun run prisma migrate dev"
fi

for i in {1..5}; do
    sudo -u $APP_USER bash -c "
        export NVM_DIR=\"\$HOME/.nvm\"
        . \"\$NVM_DIR/nvm.sh\"
        nvm use 22 >/dev/null
        export PATH=\"\$NVM_DIR/versions/node/v22.14.0/bin:\$PATH\"
        cd $APP_DIR/dashboard-autokube
        $PRISMA_CMD
    " && break
    echo -e \"${RED}⚠️  Prisma migration failed. Retrying...${NC}\"
    sleep 5
done


# # ─────────────────────────────────────────────
# # 🏗 Build Project
# # ─────────────────────────────────────────────
# echo -e "${BOLD}${BLUE}📍 STEP 9: Building the Project...${NC}"
# sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $PKG_MANAGER run build"
# fail_if_error "Build failed"

# ─────────────────────────────────────────────
# 🔧 systemd Service
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 10: Creating systemd Service...${NC}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"
if [[ "$PKG_MANAGER" == "npm" ]]; then
    EXEC_START="$NVM_DIR/versions/node/v22.14.0/.nvm/versions/node/v22.14.0/bin/npm start"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    EXEC_START="$NVM_DIR/versions/node/v22.14.0/.nvm/versions/node/v22.14.0/bin/pnpm start"
else
    EXEC_START="$BUN_PATH run start"
fi
echo -e "${BOLD}${BLUE}📍 STEP 10: Creating systemd Service...${NC}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

if [[ "$PKG_MANAGER" == "npm" ]]; then
    EXEC_START="/home/$APP_USER/.nvm/versions/node/v22.14.0/bin/npm start"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    EXEC_START="/home/$APP_USER/.nvm/versions/node/v22.14.0/bin/pnpm start"
else
    EXEC_START="$BUN_PATH run start"
fi

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=$APP_NAME service
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/dashboard-autokube
ExecStart=$EXEC_START
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF


sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME
sudo systemctl restart $APP_NAME
fail_if_error "Service failed to start"

# ─────────────────────────────────────────────
# 🌐 Nginx
# ─────────────────────────────────────────────
echo -e "${BOLD}${BLUE}📍 STEP 11: Configuring Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # WebSocket-specific route (important for Socket.IO)
    location /api/socket/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket headers
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Optional timeouts to keep connection open
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    # General traffic
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF



if [[ ! -L /etc/nginx/sites-enabled/$APP_NAME ]]; then
    sudo ln -s "$NGINX_CONF" /etc/nginx/sites-enabled/
fi

if [[ -L /etc/nginx/sites-enabled/default ]]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

sudo nginx -t
fail_if_error "Nginx config test failed"
sudo systemctl restart nginx
fail_if_error "Nginx restart failed"

# ─────────────────────────────────────────────
# 🔒 SSL
# ─────────────────────────────────────────────
if [[ "$DOMAIN" != "localhost" ]]; then
    echo -e "${YELLOW}🔐 Installing SSL for $DOMAIN...${NC}"
    sudo certbot --nginx -m "$EMAIL" -d "$DOMAIN" --agree-tos --non-interactive
    fail_if_error "SSL certificate setup failed"
fi

# ─────────────────────────────────────────────
# 🎉 All Done!
# ─────────────────────────────────────────────

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌍 App running at: ${RED}http://$DOMAIN${NC}"
echo -e "${BLUE}🌍 Server IP Address: ${RED}http://$SERVER_IP${NC}"
echo -e "${BLUE}🔑 PostgreSQL password: ${RED}$DB_PASSWORD${NC}"
echo -e "${BLUE}🔑 NextAuth Secret: ${RED}$NEXTAUTH_SECRET${NC}"
echo -e "${BLUE}🔑 Encryption Key: ${RED}$ENCRYPTION_KEY${NC}"
echo -e "${BLUE}🔑 INTERNAL API TOKEN: ${RED}$INTERNAL_API_TOKEN${NC}"
echo -e "${BLUE}📧 Admin Email: ${RED}admin@example.com${NC}"
echo -e "${BLUE}🔑 Admin Password: ${RED}admin${NC}"
