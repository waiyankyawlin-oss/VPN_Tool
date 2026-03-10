#!/bin/bash

# TeamVPN Server Installation Script
# For Ubuntu 22.04+

# Exit on error
set -e

# Update system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Shadowsocks-libev
echo "Installing Shadowsocks-libev..."
sudo apt install shadowsocks-libev -y

# Configuration
# Default values
PORT=8388
PASSWORD=$(openssl rand -base64 12)
METHOD="chacha20-ietf-poly1305"

# Create config file
echo "Creating configuration..."
sudo tee /etc/shadowsocks-libev/config.json <<EOF
{
    "server":"0.0.0.0",
    "server_port":$PORT,
    "local_port":1080,
    "password":"$PASSWORD",
    "timeout":60,
    "method":"$METHOD",
    "fast_open":true,
    "nameserver":"8.8.8.8",
    "mode":"tcp_and_udp"
}
EOF

# Restart service
echo "Restarting service..."
sudo systemctl restart shadowsocks-libev
sudo systemctl enable shadowsocks-libev

# Firewall setup
echo "Configuring firewall..."
sudo ufw allow $PORT/tcp
sudo ufw allow $PORT/udp

# Output info
IP=$(curl -s ifconfig.me)
CRED=$(echo -n "$METHOD:$PASS" | base64 | tr -d '\n')
KEY="ss://$CRED@$IP:$PORT#TeamVPN"

echo "----------------------------------------"
echo "Shadowsocks Server Installed Successfully!"
echo "Server IP: $IP"
echo "Port: $PORT"
echo "Password: $PASSWORD"
echo "Method: $METHOD"
echo "----------------------------------------"
echo "ACCESS KEY (Copy this to your client):"
echo "$KEY"
echo "----------------------------------------"
echo "Key also saved to: /root/vpn-access-key.txt"
echo "$KEY" > /root/vpn-access-key.txt
echo "Add this server to your TeamVPN Admin Panel."
