param (
    [Parameter(Mandatory=$true)]
    [string]$Query
)

$SSH_KEY = "$env:USERPROFILE\.ssh\arm-usa\ssh-key.key"
$REMOTE_USER = "ubuntu"
$REMOTE_HOST = "150.136.118.187"
$DB_PASS = "7hda}rGb_yuX2@pL9*qN4!zB1vM8"

ssh -i $SSH_KEY -o StrictHostKeyChecking=no "${REMOTE_USER}@${REMOTE_HOST}" "sudo docker exec bienestar-db mariadb -u root -p'${DB_PASS}' -D marketplace_db -e \"$Query\""
