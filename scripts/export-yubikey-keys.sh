#!/bin/bash

# Script to export PGP keys from a YubiKey
# This script requires GnuPG to be installed

WORKING_DIR="/tmp/yubikey-export-$$"
mkdir -p "$WORKING_DIR"
cd "$WORKING_DIR" || exit 1

# Get the YubiKey card status
CARD_INFO=$(gpg --card-status --with-colons)

# Extract the key fingerprints
SIGNATURE_KEY=$(echo "$CARD_INFO" | grep "^fpr:" | cut -d: -f2)
ENCRYPTION_KEY=$(echo "$CARD_INFO" | grep "^fpr:" | cut -d: -f3)
AUTHENTICATION_KEY=$(echo "$CARD_INFO" | grep "^fpr:" | cut -d: -f4)

# Create a temporary GPG home
export GNUPGHOME="$WORKING_DIR/gnupg"
mkdir -p "$GNUPGHOME"
chmod 700 "$GNUPGHOME"

# Initialize the keychain
echo "Initializing temporary GPG keychain..."
gpg --batch --yes --command-fd=0 --status-fd=1 --card-edit <<EOF
fetch
quit
EOF

# Export the keys in armored format
echo "Exporting keys..."

[[ -n "$SIGNATURE_KEY" ]] && gpg --armor --export "$SIGNATURE_KEY" > sig_key.asc
[[ -n "$ENCRYPTION_KEY" ]] && gpg --armor --export "$ENCRYPTION_KEY" > enc_key.asc
[[ -n "$AUTHENTICATION_KEY" ]] && gpg --armor --export "$AUTHENTICATION_KEY" > auth_key.asc

# Check if the export was successful
if [[ -f sig_key.asc && -s sig_key.asc ]]; then
    echo "Signature key exported: $SIGNATURE_KEY"
    echo "SIG_KEY_DATA:" 
    cat sig_key.asc
else
    echo "Failed to export signature key"
fi

if [[ -f enc_key.asc && -s enc_key.asc ]]; then
    echo "Encryption key exported: $ENCRYPTION_KEY"
    echo "ENC_KEY_DATA:"
    cat enc_key.asc
else
    echo "Failed to export encryption key"
fi

if [[ -f auth_key.asc && -s auth_key.asc ]]; then
    echo "Authentication key exported: $AUTHENTICATION_KEY" 
    echo "AUTH_KEY_DATA:"
    cat auth_key.asc
else
    echo "Failed to export authentication key"
fi

# Clean up
rm -rf "$WORKING_DIR"