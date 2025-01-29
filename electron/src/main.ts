// electron/src/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { ImapService } from './services/ImapService';

// Development environment check
const isDev = !app.isPackaged || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

let mainWindow: BrowserWindow | null = null;
let imapService: ImapService | null = null;

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
}

// IPC handlers
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