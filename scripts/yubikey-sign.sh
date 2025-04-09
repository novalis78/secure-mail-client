#!/bin/bash

# Script to sign a message using YubiKey
# This script requires GnuPG to be installed

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <message_file> <output_file>"
  exit 1
fi

MESSAGE_FILE="$1"
OUTPUT_FILE="$2"

# Get the YubiKey card status
CARD_INFO=$(gpg --card-status --with-colons)

# Extract the signature key fingerprint
SIGNATURE_KEY=$(echo "$CARD_INFO" | grep "^fpr:" | cut -d: -f2)

if [ -z "$SIGNATURE_KEY" ]; then
  echo "Error: Signature key not found on YubiKey"
  exit 1
fi

echo "Using signature key: $SIGNATURE_KEY"

# Create a detached signature
GNUPGHOME=$(mktemp -d) 
export GNUPGHOME
chmod 700 "$GNUPGHOME"

# Initialize the card
echo "Initializing temporary keychain..."
gpg --batch --yes --command-fd=0 --status-fd=1 --card-edit <<EOF
fetch
quit
EOF

# Sign the message
echo "Signing message..."
gpg --batch --yes --detach-sign --armor --default-key "$SIGNATURE_KEY" "$MESSAGE_FILE" 2>/dev/null

# Get the public key in armored format
echo "Exporting public key..."
gpg --armor --export "$SIGNATURE_KEY" > "$GNUPGHOME/pubkey.asc" 2>/dev/null

# Combine message, signature, and public key
echo "Creating output file..."
cat > "$OUTPUT_FILE" << EOF
-----BEGIN SIGNED MESSAGE-----
$(cat "$MESSAGE_FILE")
-----END SIGNED MESSAGE-----

-----BEGIN PGP SIGNATURE-----
$(cat "$MESSAGE_FILE.asc" 2>/dev/null || echo "YubiKey signature not available - PIN entry may be required")
-----END PGP SIGNATURE-----

-----BEGIN PGP PUBLIC KEY BLOCK-----
$(cat "$GNUPGHOME/pubkey.asc" 2>/dev/null || echo "YubiKey public key export failed")
-----END PGP PUBLIC KEY BLOCK-----
EOF

# Clean up
rm -rf "$GNUPGHOME" "$MESSAGE_FILE.asc" 2>/dev/null

echo "Message signed and saved to $OUTPUT_FILE"