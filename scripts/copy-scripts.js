const fs = require('fs');
const path = require('path');

// Source script
const sourceScript = path.join(__dirname, 'yubikey-sign.sh');

// Copy function
function copyScript(destDir, scriptName) {
  // Create scripts directory if it doesn't exist
  const scriptsDir = path.join(destDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  // Copy the script
  const destScript = path.join(scriptsDir, scriptName);
  fs.copyFileSync(sourceScript, destScript);
  console.log(`Copied ${sourceScript} to ${destScript}`);

  // Make the script executable
  try {
    fs.chmodSync(destScript, '755');
    console.log(`Made ${destScript} executable`);
  } catch (err) {
    console.warn(`Could not make script executable: ${err.message}`);
  }
}

// Destination directories
const electronDir = path.join(__dirname, '..', 'dist-electron');
const distDir = path.join(__dirname, '..', 'dist');
const appDir = path.join(__dirname, '..');

// Copy to all possible locations
copyScript(electronDir, 'yubikey-sign.sh');
copyScript(distDir, 'yubikey-sign.sh');
copyScript(appDir, 'yubikey-sign.sh'); // Copy to root app directory too

console.log('YubiKey scripts copied successfully to all output directories!');