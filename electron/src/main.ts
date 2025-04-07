// electron/src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ImapService } from './services/ImapService';
import { PGPService } from './services/PGPService';
import { CredentialService } from './services/CredentialService';
import { OAuthService } from './services/OAuthService';
// For loading .env files
import * as dotenv from 'dotenv';
dotenv.config();

// Development environment check
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

let mainWindow: BrowserWindow | null = null;
let imapService: ImapService | null = null;
let pgpService: PGPService | null = null;
let credentialService: CredentialService | null = null;
let oauthService: OAuthService | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  credentialService = new CredentialService();
  imapService = new ImapService(mainWindow);
  pgpService = new PGPService();
  
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

ipcMain.handle('pgp:encrypt-message', async (_, { message, recipientFingerprints }) => {
  try {
    const encryptedMessage = await pgpService?.encryptMessage(message, recipientFingerprints);
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

// YubiKey simulation for demo purposes
ipcMain.handle('yubikey:detect', async () => {
  try {
    // This is a simulated YubiKey detection
    // In a real implementation, this would interact with the YubiKey hardware
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate detection delay
    
    const yubiKeyInfo = {
      detected: true,
      serial: "12345678",
      version: "5.2.0",
      pgpKeyId: "0xA1B2C3D4E5F6"
    };
    
    // Update credential service with YubiKey status
    if (credentialService) {
      credentialService.setYubiKeyConnected(true, yubiKeyInfo.serial);
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

app.whenReady().then(createWindow);

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