"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// electron/src/main.ts
const electron_1 = require("electron");
const path = __importStar(require("path"));
const ImapService_1 = require("./services/ImapService");
// Development environment check
const isDev = !electron_1.app.isPackaged || process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
let mainWindow = null;
let imapService = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    imapService = new ImapService_1.ImapService(mainWindow);
}
// IPC handlers
electron_1.ipcMain.handle('imap:connect', async (_, config) => {
    try {
        await imapService?.connect(config);
        return { success: true };
    }
    catch (error) {
        console.error('IMAP connection error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('imap:fetch-emails', async () => {
    try {
        const emails = await imapService?.fetchPGPEmails();
        return { success: true, emails };
    }
    catch (error) {
        console.error('IMAP fetch error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.ipcMain.handle('imap:disconnect', () => {
    try {
        imapService?.disconnect();
        return { success: true };
    }
    catch (error) {
        console.error('IMAP disconnect error:', error);
        return { success: false, error: error.message };
    }
});
electron_1.app.whenReady().then(createWindow);
electron_1.app.on('window-all-closed', () => {
    imapService?.disconnect();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map