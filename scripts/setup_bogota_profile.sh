#!/bin/bash
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key_bogota.pem 2048 2>/dev/null
chmod 600 ~/.oci/oci_api_key_bogota.pem
openssl rsa -pubout -in ~/.oci/oci_api_key_bogota.pem -out ~/.oci/oci_api_key_bogota_public.pem 2>/dev/null

FINGERPRINT=$(openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key_bogota.pem 2>/dev/null | openssl md5 -c | awk '{print $2}' | tr -d '\n')

cat << EOF >> ~/.oci/config

[BOGOTA]
user=ocid1.user.oc1..aaaaaaaardopyxvtqctrhw4hfz4vay5ljwloizihg4dwewobpkfy4ph2yspa
fingerprint=$FINGERPRINT
tenancy=ocid1.tenancy.oc1..aaaaaaaalaj35kahnuxxgtfjbuwrjdgyedhn5xggl4p5ue2lnw375fctmgjq
region=sa-bogota-1
key_file=/home/ubuntu/.oci/oci_api_key_bogota.pem
EOF

echo "FINGERPRINT=$FINGERPRINT"
echo "--- PUBLIC KEY ---"
cat ~/.oci/oci_api_key_bogota_public.pem
