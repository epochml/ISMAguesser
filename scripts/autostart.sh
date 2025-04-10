#!/bin/bash

# Disable the desktop
# sudo -S systemctl set-default multi-user.target

sudo -S mkdir -p /etc/systemd/system/

cat <<EOF | sudo tee /etc/systemd/system/ismaguesser.service
[Unit]
Description=ISMAguesser
After=network.target
StartLimitInterval=0

[Service]
User=$USER
Type=simple
ExecStart=$HOME/Projects/ISMAguesser/scripts/orangepi/ismaguesser-service.fish
Restart=always
RestartSec=5
KillMode=process

[Install]
WantedBy=multi-user.target
EOF

sudo -S chmod 640 /etc/systemd/system/ismaguesser.service
sudo -S systemctl daemon-reload
sudo -S systemctl enable ismaguesser