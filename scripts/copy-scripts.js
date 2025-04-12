const fs = require('fs');
const path = require('path');

// Source scripts
const sourceScripts = [
  path.join(__dirname, 'yubikey-sign.sh'),
  path.join(__dirname, 'export-yubikey-keys.sh')
];

// Copy function
function copyScript(destDir, sourceScriptPath) {
  // Create scripts directory if it doesn't exist
  const scriptsDir = path.join(destDir, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  // Get script filename
  const scriptName = path.basename(sourceScriptPath);
  
  // Copy the script
  const destScript = path.join(scriptsDir, scriptName);
  fs.copyFileSync(sourceScriptPath, destScript);
  console.log(`Copied ${sourceScriptPath} to ${destScript}`);

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

// Copy all scripts to all possible locations
for (const sourceScript of sourceScripts) {
  copyScript(electronDir, sourceScript);
  copyScript(distDir, sourceScript);
  copyScript(appDir, sourceScript); // Copy to root app directory too
}

console.log('YubiKey scripts copied successfully to all output directories!');