#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Ask for application name
read -p "🚀 Enter the application name (default: autokube): " APP_NAME
APP_NAME=${APP_NAME:-autokube}

# Ask for system user
read -p "👤 Enter the system user to run the application (default: tester): " APP_USER
APP_USER=${APP_USER:-tester}

# Define directories
APP_DIR="/opt/$APP_NAME"
BUN_INSTALL_DIR="/home/$APP_USER/.bun"
BUN_PATH="$BUN_INSTALL_DIR/bin/bun"

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
sudo apt install -y curl unzip postgresql postgresql-contrib nginx certbot python3-certbot-nginx openssl git

# Step 2: Ensure user exists
if id "$APP_USER" &>/dev/null; then
    echo -e "${GREEN}✅ User $APP_USER already exists.${NC}"
else
    echo -e "${YELLOW}👤 Creating system user: $APP_USER...${NC}"
    sudo useradd -m -r -s /bin/bash $APP_USER
    sudo usermod -aG sudo $APP_USER
fi

# Step 3: Install Bun for the correct user
if ! sudo -u $APP_USER bash -c "command -v bun" &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Bun for $APP_USER...${NC}"
    sudo -u $APP_USER bash -c "curl -fsSL https://bun.sh/install | bash"
    sudo -u $APP_USER bash -c "echo 'export BUN_INSTALL=\"$HOME/.bun\"' >> ~/.bashrc"
    sudo -u $APP_USER bash -c "echo 'export PATH=\"\$BUN_INSTALL/bin:\$PATH\"' >> ~/.bashrc"
    sudo -u $APP_USER bash -c "source ~/.bashrc"
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

# Ensure user has access to the database
echo -e "${YELLOW}🔑 Granting privileges to '$APP_NAME' on '$APP_NAME' database...${NC}"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO $APP_NAME;"
echo -e "${GREEN}✅ PostgreSQL setup complete.${NC}"

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

# Step 6: Create or update .env file
echo -e "${YELLOW}🔧 Updating .env file with correct database credentials...${NC}"
sudo -u $APP_USER bash -c "cat > $APP_DIR/dashboard-autokube/.env" <<EOF
DATABASE_URL=postgresql://$APP_NAME:$DB_PASSWORD@localhost:5432/$APP_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://${DOMAIN}:3000
NODE_ENV=production
EOF
echo -e "${GREEN}✅ .env file updated.${NC}"

# Step 7: Run Prisma Migrations (Retry if Needed)
if [[ -d "$APP_DIR/dashboard-autokube/prisma" ]]; then
    echo -e "${YELLOW}🔧 Running Prisma Migrations...${NC}"
    for i in {1..5}; do
        sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $BUN_PATH run prisma migrate dev" && break
        echo -e "${RED}⚠️ Prisma migration failed. Retrying in 5 seconds...${NC}"
        sleep 5
    done
fi

# Step 8: Build the project
echo -e "${YELLOW}🏗 Building the project...${NC}"
sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $BUN_PATH run build"

# Step 9: Create systemd service
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=$APP_NAME service
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR/dashboard-autokube
ExecStart=$BUN_PATH server.js
Restart=always
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

# Step 10: Start and enable the service
echo -e "${YELLOW}🚀 Starting the service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME
sudo systemctl restart $APP_NAME

# Step 11: Configure Nginx
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
sudo systemctl restart nginx

# Step 12: Set up SSL if using a domain
if [[ "$DOMAIN" != "localhost" ]]; then
    echo -e "${YELLOW}🔒 Setting up SSL...${NC}"
    sudo certbot --nginx -m "$EMAIL" -d "$DOMAIN" --agree-tos --non-interactive
    echo -e "${GREEN}✅ SSL installed.${NC}"
fi


echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌍 App running at: ${RED}http://$DOMAIN${NC}"
echo -e "${BLUE}🔑 PostgreSQL password: ${RED}$DB_PASSWORD${NC}"
echo -e "${BLUE}🔑 NextAuth Secret: ${RED}$NEXTAUTH_SECRET${NC}"
