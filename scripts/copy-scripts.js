const fs = require('fs');
const path = require('path');

// Destination directory for electron development
const electronDir = path.join(__dirname, '..', 'dist-electron');

// Create scripts directory if it doesn't exist
const scriptsDir = path.join(electronDir, 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

// Copy the YubiKey signing script
const sourceScript = path.join(__dirname, 'yubikey-sign.sh');
const destScript = path.join(scriptsDir, 'yubikey-sign.sh');

fs.copyFileSync(sourceScript, destScript);
console.log(`Copied ${sourceScript} to ${destScript}`);

// Make the script executable
try {
  fs.chmodSync(destScript, '755');
  console.log(`Made ${destScript} executable`);
} catch (err) {
  console.warn(`Could not make script executable: ${err.message}`);
  console.warn('You may need to manually make the script executable.');
}

console.log('YubiKey scripts copied successfully!');