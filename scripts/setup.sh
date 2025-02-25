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

# Ask the user for the domain
read -p "🌍 Enter your domain (leave blank for localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Ask for email only if a domain is provided
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
sudo apt install -y curl unzip postgresql postgresql-contrib nginx certbot python3-certbot-nginx openssl

# Step 2: Install Bun
echo -e "${YELLOW}📦 Installing Bun...${NC}"
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Step 3: Set up PostgreSQL
echo -e "${YELLOW}🛠 Setting up PostgreSQL...${NC}"
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql <<EOF
CREATE DATABASE $APP_NAME;
CREATE USER $APP_NAME WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $APP_NAME TO $APP_NAME;
EOF

echo -e "${GREEN}✅ Database and user created successfully!${NC}"
echo -e "${BLUE}🔑 Generated secure PostgreSQL password: ${RED}$DB_PASSWORD${NC}"

# Step 4: Clone the repository
echo -e "${YELLOW}📥 Cloning project repository...${NC}"
sudo git clone https://github.com/MicroAutoKube/MicroAutoKube/tree/setup-script $APP_DIR
cd $APP_DIR/dashboard-autokube

# Step 5: Create .env file
echo -e "${YELLOW}🔧 Creating .env file...${NC}"
cat > .env <<EOF
DATABASE_URL=postgresql://$APP_NAME:$DB_PASSWORD@localhost:5432/$APP_NAME
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXTAUTH_URL=http://${DOMAIN}:3000
NODE_ENV=production
EOF

echo -e "${GREEN}✅ .env file created with secure values.${NC}"

# Step 6: Install dependencies
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
bun install --frozen-lockfile

# Step 7: Generate Prisma client (if using Prisma)
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
bun prisma generate

# Step 8: Build the project
echo -e "${YELLOW}🏗 Building the project...${NC}"
bun run build

# Step 9: Create a system user for security
echo -e "${YELLOW}👤 Creating system user...${NC}"
sudo useradd -m -r -s /bin/bash $APP_USER
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# Step 10: Create systemd service
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
SERVICE_FILE="/etc/systemd/system/$APP_NAME.service"

sudo bash -c "cat > $SERVICE_FILE" <<EOF
[Unit]
Description=$APP_NAME service
After=network.target

[Service]
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/home/$APP_USER/.bun/bin/bun server.js
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
sudo systemctl start $APP_NAME

# Step 12: Configure Nginx
echo -e "${YELLOW}🌐 Setting up Nginx reverse proxy...${NC}"
NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"

if [[ "$DOMAIN" == "localhost" ]]; then
    # Localhost configuration (no SSL)
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
    echo -e "${GREEN}✅ Configured Nginx for localhost.${NC}"
else
    # Domain configuration (with SSL)
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
    echo -e "${GREEN}✅ Configured Nginx for $DOMAIN.${NC}"
fi

sudo ln -s $NGINX_CONF /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# Step 13: Set up SSL if a domain is provided
if [[ "$DOMAIN" != "localhost" ]]; then
    echo -e "${YELLOW}🔒 Setting up SSL...${NC}"
    sudo certbot --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    echo -e "${GREEN}✅ SSL certificate installed for $DOMAIN.${NC}"
fi

# Step 14: Restart services
echo -e "${YELLOW}🔄 Restarting services...${NC}"
sudo systemctl restart nginx
sudo systemctl restart $APP_NAME

echo -e "${GREEN}✅ Deployment completed!${NC}"
if [[ "$DOMAIN" == "localhost" ]]; then
    echo -e "${BLUE}🌍 Your app is running at: ${RED}http://localhost${NC}"
else
    echo -e "${BLUE}🌍 Your app is running at: ${RED}https://$DOMAIN${NC}"
fi

echo -e "${BLUE}🔑 Secure PostgreSQL password: ${RED}$DB_PASSWORD${NC}"
echo -e "${BLUE}🔑 NextAuth Secret: ${RED}$NEXTAUTH_SECRET${NC}"
