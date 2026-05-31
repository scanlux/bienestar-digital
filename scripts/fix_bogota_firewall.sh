#!/bin/bash
# Backup existing rules
sudo cp /etc/iptables/rules.v4 /etc/iptables/rules.v4.bak

# Insert port 80 and 443 rules before the REJECT rule
sudo sed -i '/-A INPUT -j REJECT --reject-with icmp-host-prohibited/i -A INPUT -p tcp -m state --state NEW -m tcp --dport 80 -j ACCEPT\n-A INPUT -p tcp -m state --state NEW -m tcp --dport 443 -j ACCEPT' /etc/iptables/rules.v4

# Reload active rules
sudo iptables-restore < /etc/iptables/rules.v4

echo "Firewall rules updated successfully!"
echo ""
echo "=========================================================="
echo "ADVERTENCIA DE SEGURIDAD (Regla 9 - UFW/Docker):"
echo "El comando iptables-restore ha limpiado las cadenas de Docker."
echo "Para restaurar el enrutamiento de red de tus contenedores,"
echo "debes reiniciar el demonio de Docker ejecutando:"
echo ""
echo "  sudo systemctl restart docker"
echo "=========================================================="
echo ""
