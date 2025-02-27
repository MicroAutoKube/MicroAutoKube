#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to handle script interruption (Ctrl+C)
cleanup() {
    echo -e "\n${RED}⚠️  Setup interrupted! Cleaning up...${NC}"
    exit 1
}

# Trap SIGINT (Ctrl+C) to call cleanup function
trap cleanup SIGINT

# Ask for application name
read -p "🚀 Enter the application name (default: autokube): " APP_NAME
APP_NAME=${APP_NAME:-autokube}

# Ask for system user
read -p "👤 Enter the system user to run the application (default: tester): " APP_USER
APP_USER=${APP_USER:-tester}

# Ask for package manager
echo -e "${YELLOW}📦 Select a package manager:${NC}"
echo "1) bun"
echo "2) npm"
echo "3) pnpm"
read -p "Enter choice (default: bun): " PKG_MANAGER_CHOICE

# Set package manager based on user choice
case "$PKG_MANAGER_CHOICE" in
    2) PKG_MANAGER="npm";;
    3) PKG_MANAGER="pnpm";;
    *) PKG_MANAGER="bun";;
esac

# Define directories
APP_DIR="/opt/$APP_NAME"
BUN_INSTALL_DIR="/home/$APP_USER/.bun"
BUN_PATH="$BUN_INSTALL_DIR/bin/bun"
NODE_PATH="/usr/bin/node"

# Ask for domain
read -p "🌍 Enter your domain (leave blank for localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Ask for email if using a domain
if [[ "$DOMAIN" != "localhost" ]]; then
    read -p "📧 Enter your email for SSL certificate: " EMAIL
else
    EMAIL="none"
fi

# Generate secure credentials
DB_PASSWORD=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

echo -e "${BLUE}🚀 Starting $APP_NAME setup...${NC}"

# Step 1: Update system and install dependencies
echo -e "${YELLOW}🔄 Updating system and installing dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip postgresql postgresql-contrib nginx certbot python3-certbot-nginx openssl git nodejs npm

# Step 2: Ensure user exists
if id "$APP_USER" &>/dev/null; then
    echo -e "${GREEN}✅ User $APP_USER already exists.${NC}"
else
    echo -e "${YELLOW}👤 Creating system user: $APP_USER...${NC}"
    sudo useradd -m -r -s /bin/bash $APP_USER
    sudo usermod -aG sudo $APP_USER
fi

# Step 3: Install the selected package manager
if [[ "$PKG_MANAGER" == "bun" ]]; then
    if ! sudo -u $APP_USER bash -c "command -v bun" &> /dev/null; then
        echo -e "${YELLOW}📦 Installing Bun for $APP_USER...${NC}"
        sudo -u $APP_USER bash -c "curl -fsSL https://bun.sh/install | bash"
        sudo -u $APP_USER bash -c "echo 'export BUN_INSTALL=\"$HOME/.bun\"' >> ~/.bashrc"
        sudo -u $APP_USER bash -c "echo 'export PATH=\"\$BUN_INSTALL/bin:\$PATH\"' >> ~/.bashrc"
        sudo -u $APP_USER bash -c "source ~/.bashrc"
    fi
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    if ! sudo -u $APP_USER bash -c "command -v pnpm" &> /dev/null; then
        echo -e "${YELLOW}📦 Installing pnpm...${NC}"
        sudo -u $APP_USER bash -c "npm install -g pnpm"
    fi
fi

# Step 4: Set up PostgreSQL
echo -e "${YELLOW}🛠 Setting up PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check if database exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$APP_NAME'")
if [[ "$DB_EXISTS" == "1" ]]; then
    echo -e "${GREEN}✅ Database '$APP_NAME' already exists. Skipping creation.${NC}"
else
    echo -e "${YELLOW}📦 Creating database '$APP_NAME'...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $APP_NAME;"
fi

# Check if user exists and update password
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP_NAME'")
if [[ "$USER_EXISTS" == "1" ]]; then
    echo -e "${GREEN}✅ User '$APP_NAME' already exists. Updating password...${NC}"
    sudo -u postgres psql -c "ALTER USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
else
    echo -e "${YELLOW}👤 Creating PostgreSQL user '$APP_NAME'...${NC}"
    sudo -u postgres psql -c "CREATE USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
fi

# Grant necessary privileges for Prisma to work
echo -e "${YELLOW}🔑 Granting full privileges to '$APP_NAME' on '$APP_NAME' database and public schema...${NC}"
sudo -u postgres psql -c "ALTER USER $APP_NAME CREATEDB;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO $APP_NAME;"

# Ensure the user has full access to the public schema
sudo -u postgres psql -d $APP_NAME -c "GRANT USAGE, CREATE ON SCHEMA public TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $APP_NAME;"
sudo -u postgres psql -d $APP_NAME -c "ALTER SCHEMA public OWNER TO $APP_NAME;"

# Restart PostgreSQL to ensure changes apply
echo -e "${YELLOW}🔄 Restarting PostgreSQL to apply changes...${NC}"
sudo systemctl restart postgresql

# Step 5: Clone the repository
if [[ -d "$APP_DIR" ]]; then
    echo -e "${YELLOW}🔄 Repository exists. Pulling latest changes...${NC}"
    sudo -u $APP_USER bash -c "cd $APP_DIR && git pull"
else
    echo -e "${YELLOW}📥 Cloning project repository...${NC}"
    sudo -u $APP_USER bash -c "git clone https://github.com/MicroAutoKube/MicroAutoKube $APP_DIR"
fi
sudo chown -R $APP_USER:$APP_USER $APP_DIR
cd $APP_DIR/dashboard-autokube

# Step 6: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies with $PKG_MANAGER...${NC}"
sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $PKG_MANAGER install"

# Step 7: Create .env file
echo -e "${YELLOW}🔧 Creating .env file...${NC}"
sudo -u $APP_USER bash -c "cat > $APP_DIR/dashboard-autokube/.env" <<EOF
DATABASE_URL=postgresql://$APP_NAME:$DB_PASSWORD@localhost:5432/$APP_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://${DOMAIN}:3000
NODE_ENV=production
EOF

# Step 8: Run Prisma Migrations
echo -e "${YELLOW}🔧 Running Prisma Migrations with $PKG_MANAGER...${NC}"

# Determine the correct Prisma migration command
if [[ "$PKG_MANAGER" == "npm" ]]; then
    PRISMA_CMD="npx prisma migrate dev"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    PRISMA_CMD="pnpx prisma migrate dev"
else
    PRISMA_CMD="bun run prisma migrate dev"
fi

# Retry up to 5 times if migration fails
for i in {1..5}; do
    sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $PRISMA_CMD" && break
    echo -e "${RED}⚠️ Prisma migration failed. Retrying in 5 seconds...${NC}"
    sleep 5
done


# Step 9: Build the project
echo -e "${YELLOW}🏗 Building the project with $PKG_MANAGER...${NC}"
sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $PKG_MANAGER run build"

# Step 10: Create systemd service
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

# Determine correct ExecStart command based on package manager
if [[ "$PKG_MANAGER" == "npm" ]]; then
    EXEC_START="npm start"
elif [[ "$PKG_MANAGER" == "pnpm" ]]; then
    EXEC_START="pnpm start"
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

# Step 11: Start and enable the service
echo -e "${YELLOW}🚀 Starting the service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME
sudo systemctl restart $APP_NAME

# Step 12: Check if the service is running
echo -e "${YELLOW}📡 Checking service status...${NC}"
sleep 3  # Wait a few seconds for service to start
SERVICE_STATUS=$(systemctl is-active $APP_NAME)

if [[ "$SERVICE_STATUS" == "active" ]]; then
    echo -e "${GREEN}✅ Service '$APP_NAME' is running successfully!${NC}"
else
    echo -e "${RED}❌ Service '$APP_NAME' failed to start! Check logs using:${NC}"
    echo -e "${YELLOW}journalctl -u $APP_NAME --no-pager --lines=50${NC}"
fi

# Step 13: Configure Nginx
echo -e "${YELLOW}🌐 Setting up Nginx reverse proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

sudo rm -f /etc/nginx/sites-enabled/$APP_NAME
sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx

# Step 14: Set up SSL if using a domain
if [[ "$DOMAIN" != "localhost" ]]; then
    echo -e "${YELLOW}🔒 Setting up SSL...${NC}"
    sudo certbot --nginx -m "$EMAIL" -d "$DOMAIN" --agree-tos --non-interactive
    echo -e "${GREEN}✅ SSL installed.${NC}"
fi

# Get the server's IP address
SERVER_IP=$(hostname -I | awk '{print $1}')

# Final Message
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌍 App running at: ${RED}http://$DOMAIN${NC}"
echo -e "${BLUE}🌍 Server IP Address: ${RED}http://$SERVER_IP${NC}"
echo -e "${BLUE}🔑 PostgreSQL password: ${RED}$DB_PASSWORD${NC}"
echo -e "${BLUE}🔑 NextAuth Secret: ${RED}$NEXTAUTH_SECRET${NC}"

