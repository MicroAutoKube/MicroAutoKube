#!/bin/bash

# Define colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Define variables
APP_NAME="autokube"
APP_USER="nextjs"
APP_DIR="/opt/$APP_NAME"
BUN_PATH="/home/$APP_USER/.bun/bin/bun"

# Ask for domain
read -p "🌍 Enter your domain (leave blank for localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Ask for email if using a domain
if [[ "$DOMAIN" != "localhost" ]]; then
    read -p "📧 Enter your email for SSL certificate: " EMAIL
else
    EMAIL="none"
fi

# Generate a secure random password
DB_PASSWORD=$(openssl rand -hex 16)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

echo -e "${BLUE}🚀 Starting $APP_NAME setup...${NC}"

# Step 1: Update system and install dependencies
echo -e "${YELLOW}🔄 Updating system and installing dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl unzip postgresql postgresql-contrib nginx certbot python3-certbot-nginx openssl git

# Step 2: Install Bun (if not installed)
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
fi

# Step 3: Create a system user if it doesn't exist
if ! id "$APP_USER" &>/dev/null; then
    echo -e "${YELLOW}👤 Creating system user...${NC}"
    sudo useradd -m -r -s /bin/bash $APP_USER
fi

# Step 4: Set up PostgreSQL
echo -e "${YELLOW}🛠 Setting up PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql <<EOF
CREATE DATABASE $APP_NAME;
CREATE USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO $APP_NAME;
EOF

echo -e "${GREEN}✅ Database and user created successfully!${NC}"
echo -e "${BLUE}🔑 PostgreSQL password: ${RED}$DB_PASSWORD${NC}"

# Step 5: Clone the repository
echo -e "${YELLOW}📥 Cloning project repository...${NC}"
sudo git clone https://github.com/MicroAutoKube/MicroAutoKube $APP_DIR
sudo chown -R $APP_USER:$APP_USER $APP_DIR
cd $APP_DIR/dashboard-autokube

# Step 6: Create .env file
echo -e "${YELLOW}🔧 Creating .env file...${NC}"
sudo -u $APP_USER bash -c "cat > $APP_DIR/dashboard-autokube/.env" <<EOF
DATABASE_URL=postgresql://$APP_NAME:$DB_PASSWORD@localhost:5432/$APP_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://${DOMAIN}:3000
NODE_ENV=production
EOF

echo -e "${GREEN}✅ .env file created.${NC}"

# Step 7: Install dependencies as non-root user
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $BUN_PATH install --frozen-lockfile"

# Step 8: Generate Prisma client (if Prisma exists)
if [ -d "$APP_DIR/dashboard-autokube/prisma" ]; then
    echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
    sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $BUN_PATH prisma generate"
fi

# Step 9: Build the project
echo -e "${YELLOW}🏗 Building the project...${NC}"
sudo -u $APP_USER bash -c "cd $APP_DIR/dashboard-autokube && $BUN_PATH run build"

# Step 10: Create systemd service
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

# Step 11: Start and enable the service
echo -e "${YELLOW}🚀 Starting the service...${NC}"
sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME
sudo systemctl restart $APP_NAME

# Step 12: Configure Nginx
echo -e "${YELLOW}🌐 Setting up Nginx reverse proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

if [[ "$DOMAIN" == "localhost" ]]; then
    sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
else
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
fi

sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Step 13: Set up SSL if using a domain
if [[ "$DOMAIN" != "localhost" ]]; then
    echo -e "${YELLOW}🔒 Setting up SSL...${NC}"
    sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    echo -e "${GREEN}✅ SSL installed.${NC}"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌍 App running at: ${RED}http://$DOMAIN${NC}"
echo -e "${BLUE}🔑 PostgreSQL password: ${RED}$DB_PASSWORD${NC}"
echo -e "${BLUE}🔑 NextAuth Secret: ${RED}$NEXTAUTH_SECRET${NC}"
