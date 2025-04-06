// electron/src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ImapService } from './services/ImapService';
import { PGPService } from './services/PGPService';

// Development environment check
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

let mainWindow: BrowserWindow | null = null;
let imapService: ImapService | null = null;
let pgpService: PGPService | null = null;

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

  imapService = new ImapService(mainWindow);
  pgpService = new PGPService();
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
    
    return { 
      success: true, 
      yubikey: {
        detected: true,
        serial: "12345678",
        version: "5.2.0",
        pgpKeyId: "0xA1B2C3D4E5F6"
      }
    };
  } catch (error) {
    console.error('YubiKey detection error:', error);
    return { success: false, error: error.message };
  }
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