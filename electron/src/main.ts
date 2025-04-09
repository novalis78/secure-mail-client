// electron/src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ImapService } from './services/ImapService';
import { PGPService } from './services/PGPService';
import { CredentialService } from './services/CredentialService';
import { OAuthService } from './services/OAuthService';
import { YubiKeyService } from './services/YubiKeyService';
// For loading .env files
import * as dotenv from 'dotenv';
dotenv.config();

// Development environment check
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// Set application name for better identification
app.name = 'Secure Mail Client';

let mainWindow: BrowserWindow | null = null;
let imapService: ImapService | null = null;
let pgpService: PGPService | null = null;
let credentialService: CredentialService | null = null;
let oauthService: OAuthService | null = null;
let yubiKeyService: YubiKeyService | null = null;

function createWindow() {
  // Use absolute path for icon
  const appDir = app.getAppPath();
  const iconPath = path.join(appDir, 'public/icon.png');
  console.log('Setting app icon from path:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden',
    frame: false,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  // Start the app in maximized/full screen mode
  mainWindow.maximize();
  
  // Set application icon programmatically (macOS)
  if (process.platform === 'darwin') {
    try {
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.error('Failed to set dock icon in window creation:', error);
    }
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  credentialService = new CredentialService();
  imapService = new ImapService(mainWindow);
  pgpService = new PGPService();
  yubiKeyService = new YubiKeyService();
  
  // Check and integrate YubiKey PGP keys if available
  setTimeout(async () => {
    try {
      if (yubiKeyService && pgpService) {
        console.log('[main] Checking for YubiKey PGP keys');
        
        // Detect YubiKey
        const yubiKeyInfo = await yubiKeyService.detectYubiKey();
        if (yubiKeyInfo.detected && yubiKeyInfo.pgpInfo) {
          console.log('[main] YubiKey detected with PGP info');
          
          // For debugging, list the fingerprints
          const fingerprintInfo = {
            signature: yubiKeyInfo.pgpInfo.signatureKey?.fingerprint,
            decryption: yubiKeyInfo.pgpInfo.decryptionKey?.fingerprint,
            authentication: yubiKeyInfo.pgpInfo.authenticationKey?.fingerprint
          };
          console.log('[main] YubiKey PGP fingerprints:', JSON.stringify(fingerprintInfo, null, 2));
          
          // Check the current PGP keys
          const currentKeys = pgpService.getPublicKeys();
          console.log('[main] Current PGP key count:', currentKeys?.length || 0);
          
          // If we don't have any PGP keys yet, automatically import from YubiKey
          if (!currentKeys || currentKeys.length === 0) {
            console.log('[main] No PGP keys found in store, importing from YubiKey');
            
            // Call our function directly instead of using IPC
            const importResult = await yubiKeyService.exportPublicKeys();
            
            if (importResult.success && importResult.keys) {
              console.log('[main] Successfully exported YubiKey keys, importing to PGP store');
              
              // Now import each key
              const importResults: Array<{type: string; fingerprint?: string; success: boolean; error?: string}> = [];
              let defaultKeySet = false;
              
              // Process signature key
              if (importResult.keys.signature) {
                try {
                  const fingerprint = await pgpService.importPublicKey(importResult.keys.signature);
                  importResults.push({ type: 'signature', fingerprint, success: true });
                  
                  // Mark the key as coming from YubiKey
                  pgpService.markKeyAsYubiKey(fingerprint);
                  
                  // Set the first key as default
                  if (!defaultKeySet) {
                    pgpService.setDefaultKey(fingerprint);
                    defaultKeySet = true;
                  }
                } catch (error) {
                  importResults.push({ 
                    type: 'signature', 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                  });
                }
              }
              
              // Process decryption key
              if (importResult.keys.decryption) {
                try {
                  const fingerprint = await pgpService.importPublicKey(importResult.keys.decryption);
                  importResults.push({ type: 'decryption', fingerprint, success: true });
                  
                  // Mark the key as coming from YubiKey
                  pgpService.markKeyAsYubiKey(fingerprint);
                  
                  if (!defaultKeySet) {
                    pgpService.setDefaultKey(fingerprint);
                    defaultKeySet = true;
                  }
                } catch (error) {
                  importResults.push({ 
                    type: 'decryption', 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error' 
                  });
                }
              }
              
              // Process authentication key
              if (importResult.keys.authentication) {
                try {
                  const fingerprint = await pgpService.importPublicKey(importResult.keys.authentication);
                  importResults.push({ type: 'authentication', fingerprint, success: true });
                  
                  // Mark the key as coming from YubiKey
                  pgpService.markKeyAsYubiKey(fingerprint);
                  
                  if (!defaultKeySet) {
                    pgpService.setDefaultKey(fingerprint);
                    defaultKeySet = true;
                  }
                } catch (error) {
                  importResults.push({ 
                    type: 'authentication', 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                }
              }
              
              const successCount = importResults.filter((r) => r.success).length;
              console.log('[main] Imported keys:', successCount, 'key(s)');
              
              if (defaultKeySet) {
                console.log('[main] Default key has been set');
              }
            } else {
              console.warn('[main] Failed to export YubiKey keys:', importResult.error);
            }
          } else {
            // If we have keys, check if we need to set a default
            const hasDefault = currentKeys.some(key => key.isDefault);
            if (!hasDefault) {
              console.log('[main] No default key set, setting first key as default');
              try {
                pgpService.setDefaultKey(currentKeys[0].fingerprint);
                console.log('[main] Set default key to:', currentKeys[0].fingerprint);
              } catch (defaultError) {
                console.error('[main] Error setting default key:', defaultError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[main] Error checking YubiKey PGP keys:', error);
    }
  }, 3000); // Delay to ensure services are initialized
  
  // Initialize OAuth service with error handling
  try {
    oauthService = new OAuthService(mainWindow);
  } catch (error) {
    console.error('Error initializing OAuth service:', error);
    // We'll continue without OAuth services
  }
  
  // Automatically try to connect with saved credentials on startup
  setTimeout(async () => {
    try {
      // Check if we have stored credentials
      const storedConfig = credentialService?.getImapCredentials();
      
      if (storedConfig && storedConfig.email && storedConfig.password) {
        console.log('Attempting to connect with stored credentials:', {
          email: storedConfig.email,
          host: storedConfig.host,
          port: storedConfig.port
        });
        
        // Adapt the credential format to what ImapService expects
        await imapService?.connect({
          user: storedConfig.email,
          password: storedConfig.password,
          host: storedConfig.host || 'imap.gmail.com', // Default to Gmail if not specified
          port: storedConfig.port || 993           // Default to standard IMAP SSL port if not specified
        });
        
        // Add a slight delay before fetching emails to ensure connection is fully established
        setTimeout(async () => {
          try {
            console.log('Auto-fetching emails after connection');
            await imapService?.fetchPGPEmails();
          } catch (fetchError) {
            console.error('Error auto-fetching emails after connection:', fetchError);
          }
        }, 2000);
      } else {
        console.log('No stored IMAP credentials found for auto-connection');
      }
    } catch (error) {
      console.error('Error auto-connecting with stored credentials:', error);
      // We'll let the user connect manually
    }
  }, 2500); // Increase delay to ensure UI is fully loaded
}

// IMAP IPC handlers
ipcMain.handle('imap:connect', async (_, config) => {
  try {
    await imapService?.connect(config);
    return { success: true };
  } catch (error) {
    console.error('IMAP connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imap:fetch-emails', async () => {
  try {
    // If not connected, try to use stored credentials
    if (!imapService || !(imapService as any).isConnected) {
      console.log('IMAP not connected during fetch request, trying to connect with stored credentials');
      const storedConfig = credentialService?.getImapCredentials();
      
      if (storedConfig && storedConfig.email && storedConfig.password) {
        console.log('Found stored credentials, attempting to connect');
        await imapService?.connect({
          user: storedConfig.email,
          password: storedConfig.password,
          host: storedConfig.host || 'imap.gmail.com',
          port: storedConfig.port || 993
        });
        // Allow a brief moment for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log('No stored credentials found, user needs to connect manually');
        return { success: false, error: 'Not connected to IMAP server. Please connect in settings.' };
      }
    }
    
    // Now try to fetch emails
    const emails = await imapService?.fetchPGPEmails();
    return { success: true, emails };
  } catch (error) {
    console.error('IMAP fetch error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('imap:disconnect', () => {
  try {
    imapService?.disconnect();
    return { success: true };
  } catch (error) {
    console.error('IMAP disconnect error:', error);
    return { success: false, error: error.message };
  }
});

// PGP IPC handlers
ipcMain.handle('pgp:generate-key', async (_, { name, email, passphrase }) => {
  try {
    const keyPair = await pgpService?.generateKeyPair(name, email, passphrase);
    return { success: true, keyPair };
  } catch (error) {
    console.error('PGP key generation error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:import-public-key', async (_, { armoredKey }) => {
  try {
    const fingerprint = await pgpService?.importPublicKey(armoredKey);
    return { success: true, fingerprint };
  } catch (error) {
    console.error('PGP key import error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:get-public-keys', () => {
  try {
    const keys = pgpService?.getPublicKeys();
    return { success: true, keys };
  } catch (error) {
    console.error('PGP get keys error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:set-default-key', (_, { fingerprint }) => {
  try {
    pgpService?.setDefaultKey(fingerprint);
    return { success: true };
  } catch (error) {
    console.error('PGP set default key error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:delete-key', (_, { fingerprint }) => {
  try {
    pgpService?.deleteKey(fingerprint);
    return { success: true };
  } catch (error) {
    console.error('PGP delete key error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:encrypt-message', async (_, { message, recipientFingerprints, options }) => {
  try {
    const encryptedMessage = await pgpService?.encryptMessage(
      message, 
      recipientFingerprints, 
      options || { sign: true, attachPublicKey: true }
    );
    return { success: true, encryptedMessage };
  } catch (error) {
    console.error('PGP encrypt error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('pgp:decrypt-message', async (_, { encryptedMessage, passphrase }) => {
  try {
    const decryptedMessage = await pgpService?.decryptMessage(encryptedMessage, passphrase);
    return { success: true, decryptedMessage };
  } catch (error) {
    console.error('PGP decrypt error:', error);
    return { success: false, error: error.message };
  }
});

// Add handlers for new PGP functionality
ipcMain.handle('pgp:sign-message', async (_, { message, passphrase }) => {
  try {
    if (!pgpService) {
      return { 
        success: false, 
        originalMessage: message,
        error: 'PGP service not initialized' 
      };
    }
    
    // The signMessage method now returns a complete result object
    const result = await pgpService.signMessage(message, passphrase);
    return result;
  } catch (error) {
    console.error('PGP sign error:', error);
    return { 
      success: false, 
      originalMessage: message,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

ipcMain.handle('pgp:add-contact', async (_, { email, name, publicKey }) => {
  try {
    if (!pgpService) {
      return { success: false, error: 'PGP service not initialized' };
    }
    // Need to await since addContact is now async
    const result = await pgpService.addContact(email, name, publicKey);
    return result;
  } catch (error) {
    console.error('PGP add contact error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('pgp:extract-key-from-message', async (_, { message }) => {
  try {
    const result = await pgpService?.extractPublicKeyFromMessage(message);
    return { success: true, ...result };
  } catch (error) {
    console.error('PGP extract key error:', error);
    return { success: false, error: error.message };
  }
});

// Real YubiKey detection and related functionality
ipcMain.handle('yubikey:detect', async () => {
  try {
    if (!yubiKeyService) {
      throw new Error('YubiKey service not initialized');
    }
    
    // Detect the YubiKey
    const yubiKeyInfo = await yubiKeyService.detectYubiKey();
    
    // Update credential service with YubiKey status
    if (credentialService && yubiKeyInfo.detected && yubiKeyInfo.serial) {
      credentialService.setYubiKeyConnected(true, yubiKeyInfo.serial);
    } else if (credentialService) {
      credentialService.setYubiKeyConnected(false);
    }
    
    return { 
      success: true, 
      yubikey: yubiKeyInfo
    };
  } catch (error) {
    console.error('YubiKey detection error:', error);
    if (credentialService) {
      credentialService.setYubiKeyConnected(false);
    }
    return { success: false, error: error.message };
  }
});

// Check if YubiKey has PGP keys configured
ipcMain.handle('yubikey:has-pgp-keys', async () => {
  try {
    if (!yubiKeyService) {
      throw new Error('YubiKey service not initialized');
    }
    
    const hasPGPKeys = await yubiKeyService.hasPGPKeys();
    return { 
      success: true, 
      hasPGPKeys 
    };
  } catch (error) {
    console.error('Error checking YubiKey PGP keys:', error);
    return { success: false, error: error.message };
  }
});

// Get PGP fingerprints from YubiKey
ipcMain.handle('yubikey:get-pgp-fingerprints', async () => {
  try {
    if (!yubiKeyService) {
      throw new Error('YubiKey service not initialized');
    }
    
    const fingerprints = await yubiKeyService.getPGPFingerprints();
    return { 
      success: true, 
      fingerprints 
    };
  } catch (error) {
    console.error('Error getting YubiKey PGP fingerprints:', error);
    return { success: false, error: error.message };
  }
});

// Export YubiKey public keys
ipcMain.handle('yubikey:export-public-keys', async () => {
  try {
    if (!yubiKeyService) {
      throw new Error('YubiKey service not initialized');
    }
    
    const result = await yubiKeyService.exportPublicKeys();
    return result;
  } catch (error) {
    console.error('Error exporting YubiKey public keys:', error);
    return { success: false, error: error.message };
  }
});

// Import YubiKey keys to PGP store
ipcMain.handle('yubikey:import-to-pgp', async () => {
  try {
    if (!yubiKeyService || !pgpService) {
      throw new Error('Required services not initialized');
    }
    
    // Export keys from YubiKey
    const exportResult = await yubiKeyService.exportPublicKeys();
    if (!exportResult.success || !exportResult.keys) {
      return { 
        success: false, 
        error: exportResult.error || 'Failed to export keys from YubiKey' 
      };
    }
    
    const importResults = [];
    let defaultKeySet = false;
    
    // Try to import all available keys
    if (exportResult.keys.signature) {
      try {
        console.log('[main] Importing YubiKey signature key');
        const fingerprint = await pgpService.importPublicKey(exportResult.keys.signature);
        importResults.push({ type: 'signature', fingerprint, success: true });
        
        // Mark the key as coming from YubiKey
        pgpService.markKeyAsYubiKey(fingerprint);
        
        // Set first successful key as default
        if (!defaultKeySet) {
          pgpService.setDefaultKey(fingerprint);
          defaultKeySet = true;
          console.log('[main] Set signature key as default:', fingerprint);
        }
      } catch (importError) {
        console.error('[main] Error importing signature key:', importError);
        importResults.push({ 
          type: 'signature', 
          success: false, 
          error: importError.message 
        });
      }
    }
    
    if (exportResult.keys.decryption) {
      try {
        console.log('[main] Importing YubiKey decryption key');
        const fingerprint = await pgpService.importPublicKey(exportResult.keys.decryption);
        importResults.push({ type: 'decryption', fingerprint, success: true });
        
        // Mark the key as coming from YubiKey
        pgpService.markKeyAsYubiKey(fingerprint);
        
        // Set first successful key as default if none set yet
        if (!defaultKeySet) {
          pgpService.setDefaultKey(fingerprint);
          defaultKeySet = true;
          console.log('[main] Set decryption key as default:', fingerprint);
        }
      } catch (importError) {
        console.error('[main] Error importing decryption key:', importError);
        importResults.push({ 
          type: 'decryption', 
          success: false, 
          error: importError.message 
        });
      }
    }
    
    if (exportResult.keys.authentication) {
      try {
        console.log('[main] Importing YubiKey authentication key');
        const fingerprint = await pgpService.importPublicKey(exportResult.keys.authentication);
        importResults.push({ type: 'authentication', fingerprint, success: true });
        
        // Mark the key as coming from YubiKey
        pgpService.markKeyAsYubiKey(fingerprint);
        
        // Set first successful key as default if none set yet
        if (!defaultKeySet) {
          pgpService.setDefaultKey(fingerprint);
          defaultKeySet = true;
          console.log('[main] Set authentication key as default:', fingerprint);
        }
      } catch (importError) {
        console.error('[main] Error importing authentication key:', importError);
        importResults.push({ 
          type: 'authentication', 
          success: false, 
          error: importError.message 
        });
      }
    }
    
    return { 
      success: importResults.some(result => result.success), 
      importResults,
      defaultKeySet
    };
  } catch (error) {
    console.error('Error importing YubiKey keys to PGP store:', error);
    return { success: false, error: error.message };
  }
});

// Credential service IPC handlers
ipcMain.handle('credentials:save-gmail', async (_, { email, password }) => {
  try {
    credentialService?.saveGmailCredentials(email, password);
    return { success: true };
  } catch (error) {
    console.error('Error saving Gmail credentials:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('credentials:get-gmail', async () => {
  try {
    const credentials = credentialService?.getGmailCredentials();
    return { success: true, credentials };
  } catch (error) {
    console.error('Error getting Gmail credentials:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('credentials:save-imap', async (_, credentials) => {
  try {
    credentialService?.saveImapCredentials(credentials);
    return { success: true };
  } catch (error) {
    console.error('Error saving IMAP credentials:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('credentials:get-imap', async () => {
  try {
    const credentials = credentialService?.getImapCredentials();
    return { success: true, credentials };
  } catch (error) {
    console.error('Error getting IMAP credentials:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('credentials:clear', async () => {
  try {
    credentialService?.clearAllCredentials();
    return { success: true };
  } catch (error) {
    console.error('Error clearing credentials:', error);
    return { success: false, error: error.message };
  }
});

// OAuth IPC handlers
ipcMain.handle('oauth:check-auth', async () => {
  if (!oauthService) {
    console.warn('OAuth service not initialized, oauth:check-auth called');
    return { 
      success: false, 
      isAuthenticated: false, 
      error: 'OAuth service not available. Check credentials.json file.' 
    };
  }
  
  try {
    const authStatus = oauthService.checkAuthentication();
    return authStatus;
  } catch (error) {
    console.error('Error checking OAuth authentication:', error);
    return { success: false, isAuthenticated: false, error: error.message };
  }
});

ipcMain.handle('oauth:authenticate', async () => {
  if (!oauthService) {
    console.warn('OAuth service not initialized, oauth:authenticate called');
    return { 
      success: false, 
      error: 'OAuth service not available. Check credentials.json file.' 
    };
  }
  
  try {
    const authResult = await oauthService.authenticate();
    return authResult;
  } catch (error) {
    console.error('Error during OAuth authentication:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('oauth:logout', async () => {
  if (!oauthService) {
    console.warn('OAuth service not initialized, oauth:logout called');
    return { 
      success: false, 
      error: 'OAuth service not available. Check credentials.json file.' 
    };
  }
  
  try {
    const logoutResult = await oauthService.logout();
    return logoutResult;
  } catch (error) {
    console.error('Error during OAuth logout:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('oauth:fetch-emails', async () => {
  if (!oauthService) {
    console.warn('OAuth service not initialized, oauth:fetch-emails called');
    return { 
      success: false, 
      emails: [],
      error: 'OAuth service not available. Check credentials.json file.' 
    };
  }
  
  try {
    const emailsResult = await oauthService.fetchEmails();
    
    // If emails were successfully fetched, also notify via the IMAP service's event system
    if (emailsResult.success && emailsResult.emails && mainWindow) {
      mainWindow.webContents.send('imap:emails-fetched', emailsResult.emails);
    }
    
    return emailsResult;
  } catch (error) {
    console.error('Error fetching emails with OAuth:', error);
    return { success: false, emails: [], error: error.message };
  }
});

ipcMain.handle('oauth:send-email', async (_, { to, subject, body }) => {
  if (!oauthService) {
    console.warn('OAuth service not initialized, oauth:send-email called');
    return { 
      success: false, 
      error: 'OAuth service not available. Check credentials.json file.' 
    };
  }
  
  try {
    const sendResult = await oauthService.sendEmail(to, subject, body);
    return sendResult;
  } catch (error) {
    console.error('Error sending email with OAuth:', error);
    return { success: false, error: error.message };
  }
});

// Handle OAuth code responses from the renderer
ipcMain.on('oauth:code-response', (_, code) => {
  mainWindow?.webContents.emit('oauth:code-response', code);
});

ipcMain.on('oauth:code-cancelled', () => {
  mainWindow?.webContents.emit('oauth:code-cancelled');
});

app.whenReady().then(() => {
  // Set dock icon immediately on macOS
  if (process.platform === 'darwin') {
    try {
      // Fix path to use absolute path
      const appDir = app.getAppPath();
      const iconPath = path.join(appDir, 'public/icon.png');
      console.log('Setting dock icon from path:', iconPath);
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.error('Failed to set dock icon:', error);
    }
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  imapService?.disconnect();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});