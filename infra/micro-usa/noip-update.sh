#!/bin/bash
CONFIG_FILE="/etc/noip.conf"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Archivo de configuracion $CONFIG_FILE no encontrado."
    exit 1
fi

source "$CONFIG_FILE"

IP_FILE="/tmp/last_noip_ip"
CURRENT_IP=$(curl -s https://ifconfig.me)

if [ -z "$CURRENT_IP" ]; then
    echo "Error: No se pudo obtener la IP publica."
    exit 1
fi

LAST_IP=""
if [ -f "$IP_FILE" ]; then
    LAST_IP=$(cat "$IP_FILE")
fi

if [ "$CURRENT_IP" != "$LAST_IP" ]; then
    echo "IP cambio de '$LAST_IP' a '$CURRENT_IP'. Actualizando No-IP..."
    RESPONSE=$(curl -s -u "$NOIP_USER:$NOIP_PASS" \
        --user-agent "DomiClient/1.0 starlux@trendy.sytes.net" \
        "https://dynupdate.no-ip.com/nic/update?hostname=${NOIP_HOST}&myip=${CURRENT_IP}")
    
    echo "Respuesta de No-IP: $RESPONSE"
    
    if [[ "$RESPONSE" == good* ]] || [[ "$RESPONSE" == nochg* ]]; then
        echo "$CURRENT_IP" > "$IP_FILE"
        echo "Actualizacion exitosa."
    else
        echo "Error al actualizar No-IP: $RESPONSE"
        exit 1
    fi
else
    echo "La IP no ha cambiado ($CURRENT_IP). No se requiere actualizacion."
fi
