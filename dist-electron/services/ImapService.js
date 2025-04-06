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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapService = void 0;
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const bcrypt_1 = require("bcrypt");
// Import store from a service manager to avoid direct instantiation
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Create a simple file-based storage instead of using electron-store directly
const getConfigPath = () => path.join(electron_1.app.getPath('userData'), 'imap-config.json');
// Simple file-based config functions
const readConfig = () => {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        catch (error) {
            console.error('Error reading config:', error);
            return {};
        }
    }
    return {};
};
const writeConfig = (config) => {
    const configPath = getConfigPath();
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    catch (error) {
        console.error('Error writing config:', error);
    }
};
function encryptPassword(password) {
    return Promise.resolve((0, bcrypt_1.hashSync)(password, 10));
}
class ImapService {
    imap;
    mainWindow;
    isConnected = false;
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
    }
    async connect(config) {
        try {
            // Save configuration to our simple file-based storage
            const imapConfig = {
                host: config.host || 'imap.gmail.com',
                port: config.port || 993,
                user: config.user
                // We don't store the password in the config file
            };
            // Save minimal config (without password)
            const currentConfig = readConfig();
            writeConfig({ ...currentConfig, imapConfig });
            this.mainWindow.webContents.send('imap:status', 'Connecting to server...');
            // Improved IMAP connection with better error handling for Gmail
            this.imap = new imap_1.default({
                user: config.user,
                password: config.password,
                host: config.host || 'imap.gmail.com',
                port: config.port || 993,
                tls: true,
                tlsOptions: { rejectUnauthorized: true },
                authTimeout: 20000, // Increase timeout for slower connections
                connTimeout: 30000 // Connection timeout
            });
            return new Promise((resolve, reject) => {
                this.imap.once('ready', () => {
                    this.isConnected = true;
                    this.mainWindow.webContents.send('imap:connected');
                    this.mainWindow.webContents.send('imap:status', 'Connected, fetching emails...');
                    resolve(true);
                    // Start fetching emails automatically after connection
                    this.fetchPGPEmails().catch(err => {
                        this.mainWindow.webContents.send('imap:error', err.message);
                    });
                });
                this.imap.once('error', (err) => {
                    this.isConnected = false;
                    this.mainWindow.webContents.send('imap:error', err.message);
                    reject(err);
                });
                this.imap.once('end', () => {
                    this.isConnected = false;
                    this.mainWindow.webContents.send('imap:disconnected');
                });
                this.imap.connect();
            });
        }
        catch (error) {
            this.mainWindow.webContents.send('imap:error', error.message);
            throw error;
        }
    }
    disconnect() {
        if (this.imap && this.isConnected) {
            this.imap.end();
        }
    }
    async fetchPGPEmails() {
        if (!this.isConnected) {
            throw new Error('Not connected to IMAP server');
        }
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }
                // Simplified search criteria to be more compatible with different IMAP servers
                const searchCriteria = [
                    ['OR',
                        ['BODY', 'BEGIN PGP MESSAGE'],
                        ['BODY', 'BEGIN PGP SIGNED MESSAGE']
                    ]
                ];
                this.imap.search(searchCriteria, (err, results) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    if (!results || !results.length) {
                        this.mainWindow.webContents.send('imap:emails-fetched', []);
                        resolve([]);
                        return;
                    }
                    const fetch = this.imap.fetch(results, {
                        bodies: '',
                        struct: true
                    });
                    const messages = [];
                    let processedCount = 0;
                    const messagePromises = [];
                    fetch.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            const messagePromise = new Promise((resolveMsg, rejectMsg) => {
                                (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                                    if (err) {
                                        rejectMsg(err);
                                        return;
                                    }
                                    processedCount++;
                                    this.mainWindow.webContents.send('imap:progress', {
                                        current: processedCount,
                                        total: results.length
                                    });
                                    // Enhanced PGP detection logic
                                    const text = parsed.text || '';
                                    const subject = parsed.subject || '';
                                    const html = parsed.html || '';
                                    // Check for PGP content in various message parts
                                    const isPGP = 
                                    // Look for standard PGP markers
                                    text.includes('BEGIN PGP MESSAGE') ||
                                        text.includes('BEGIN PGP SIGNED MESSAGE') ||
                                        // Look for patterns in HTML content as well (some clients may format the message)
                                        html.includes('BEGIN PGP MESSAGE') ||
                                        html.includes('BEGIN PGP SIGNED MESSAGE') ||
                                        // Check for PGP/GPG in subject (common for encrypted messages)
                                        /\bPGP\b/i.test(subject) ||
                                        /\bGPG\b/i.test(subject) ||
                                        /encrypted/i.test(subject);
                                    if (isPGP) {
                                        messages.push({
                                            id: parsed.messageId || `${Date.now()}-${processedCount}`,
                                            from: parsed.from?.text || 'Unknown',
                                            subject: parsed.subject || 'No Subject',
                                            status: 'NEW',
                                            isEncrypted: true,
                                            date: parsed.date || new Date(),
                                            text: parsed.text || undefined,
                                            html: parsed.html || null
                                        });
                                    }
                                    resolveMsg();
                                });
                            });
                            messagePromises.push(messagePromise);
                        });
                    });
                    fetch.on('error', (err) => {
                        reject(err);
                    });
                    fetch.on('end', () => {
                        // Wait for all message parsing to complete before resolving
                        Promise.all(messagePromises)
                            .then(() => {
                            const sortedMessages = messages.sort((a, b) => b.date.getTime() - a.date.getTime());
                            this.mainWindow.webContents.send('imap:emails-fetched', sortedMessages);
                            resolve(sortedMessages);
                        })
                            .catch(err => {
                            reject(err);
                        });
                    });
                });
            });
        });
    }
    async saveImapConfig(config) {
        try {
            const validatedConfig = {
                host: config.host,
                port: config.port,
                tls: config.tls,
                auth: {
                    user: config.auth.user,
                    // We'll handle the password securely elsewhere with CredentialService
                }
            };
            // Save minimal config to our file-based storage
            const currentConfig = readConfig();
            writeConfig({
                ...currentConfig,
                imapConfig: {
                    host: validatedConfig.host,
                    port: validatedConfig.port,
                    tls: validatedConfig.tls,
                    user: validatedConfig.auth.user
                }
            });
            return {
                success: true,
                config: {
                    host: validatedConfig.host,
                    port: validatedConfig.port,
                    tls: validatedConfig.tls,
                    user: validatedConfig.auth.user
                }
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
}
exports.ImapService = ImapService;
//# sourceMappingURL=ImapService.js.map