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
        if (!this.isConnected || !this.imap) {
            console.warn('IMAP not connected, attempting to reconnect before fetching emails');
            // Try to initialize a connection if we have stored credentials
            try {
                // Check if there are stored credentials we can use
                const storedConfig = readConfig().imapConfig;
                if (!storedConfig || !storedConfig.user) {
                    throw new Error('No IMAP configuration available for auto-reconnection');
                }
                // We don't have the password here, so we need to notify the UI to prompt for credentials
                this.mainWindow.webContents.send('imap:prompt-credentials');
                throw new Error('Not connected to IMAP server - please enter credentials');
            }
            catch (error) {
                throw new Error('Not connected to IMAP server');
            }
        }
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, box) => {
                if (err) {
                    reject(err);
                    return;
                }
                // Enhanced search criteria to catch more encrypted emails
                const searchCriteria = [
                    ['OR',
                        ['BODY', 'BEGIN PGP MESSAGE'],
                        ['BODY', 'BEGIN PGP SIGNED MESSAGE'],
                        ['BODY', 'PGP'],
                        ['BODY', 'ENCRYPTED'],
                        ['SUBJECT', 'PGP'],
                        ['SUBJECT', 'ENCRYPTED']
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
                                        console.error('Error parsing email:', err);
                                        rejectMsg(err);
                                        return;
                                    }
                                    processedCount++;
                                    this.mainWindow.webContents.send('imap:progress', {
                                        current: processedCount,
                                        total: results.length
                                    });
                                    // Log detailed email content for debugging
                                    console.log('Parsed email debug:', {
                                        id: parsed.messageId,
                                        subject: parsed.subject,
                                        hasText: !!parsed.text,
                                        textLength: typeof parsed.text === 'string' ? parsed.text.length : 0,
                                        hasHtml: !!parsed.html,
                                        htmlLength: typeof parsed.html === 'string' ? parsed.html.length : 0,
                                        textSample: typeof parsed.text === 'string' ? parsed.text.substring(0, 100) + '...' : null
                                    });
                                    // Enhanced PGP detection logic
                                    const text = typeof parsed.text === 'string' ? parsed.text : '';
                                    const subject = parsed.subject || '';
                                    const html = typeof parsed.html === 'string' ? parsed.html : '';
                                    // Check for PGP content in various message parts
                                    const isPGP = 
                                    // Look for standard PGP markers
                                    text.includes('BEGIN PGP MESSAGE') ||
                                        text.includes('BEGIN PGP SIGNED MESSAGE') ||
                                        // Look for patterns in HTML content as well (some clients may format the message)
                                        html.includes('BEGIN PGP MESSAGE') ||
                                        html.includes('BEGIN PGP SIGNED MESSAGE') ||
                                        // Look for Mailvelope signatures (common in forwarded messages)
                                        text.includes('Version: Mailvelope') ||
                                        html.includes('Version: Mailvelope') ||
                                        // Look for common forwarded message patterns with PGP content
                                        text.includes('Forwarded message') && (text.includes('BEGIN PGP') ||
                                            text.includes('END PGP')) ||
                                        // Look for other PGP client signatures
                                        text.includes('Version: GnuPG') ||
                                        html.includes('Version: GnuPG') ||
                                        text.includes('Version: OpenPGP') ||
                                        html.includes('Version: OpenPGP') ||
                                        // Check for PGP/GPG in subject (common for encrypted messages)
                                        /\bPGP\b/i.test(subject) ||
                                        /\bGPG\b/i.test(subject) ||
                                        /\bencrypted\b/i.test(subject) ||
                                        /\bsecure message\b/i.test(subject);
                                    if (isPGP) {
                                        // Important: Make a stringified copy of the content to ensure it's passed properly
                                        const textContent = typeof parsed.text === 'string' ? String(parsed.text) : '';
                                        const htmlContent = typeof parsed.html === 'string' ? String(parsed.html) : '';
                                        // Log whether we found any content
                                        console.log(`Found email with content: text=${!!textContent}, html=${!!htmlContent}, id=${parsed.messageId}`);
                                        // Get the email body from console output
                                        const emailBody = text || html;
                                        messages.push({
                                            id: parsed.messageId || `${Date.now()}-${processedCount}`,
                                            from: parsed.from?.text || 'Unknown',
                                            subject: parsed.subject || 'No Subject',
                                            status: 'NEW',
                                            isEncrypted: true,
                                            date: parsed.date || new Date(),
                                            text: text || undefined,
                                            html: html || undefined,
                                            body: emailBody // Add body field
                                        });
                                        // Log the actual message being pushed
                                        console.log('Email content being pushed:', {
                                            messageId: parsed.messageId,
                                            textLength: text.length,
                                            htmlLength: html.length,
                                            bodyLength: emailBody.length
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
                            // Log message content before sending across IPC
                            console.log(`MAIN PROCESS: Sending ${sortedMessages.length} emails to renderer`);
                            if (sortedMessages.length > 0) {
                                const sample = sortedMessages[0];
                                console.log('MAIN PROCESS: First email content check:', {
                                    id: sample.id,
                                    subject: sample.subject,
                                    textExists: !!sample.text,
                                    textType: typeof sample.text,
                                    textLength: sample.text ? sample.text.length : 0,
                                    htmlExists: !!sample.html,
                                    htmlType: typeof sample.html,
                                    htmlLength: sample.html ? sample.html.length : 0,
                                    textSample: sample.text ? sample.text.substring(0, 200) : 'NO TEXT CONTENT'
                                });
                            }
                            // Clone the messages to ensure they're properly serializable
                            const serializedMessages = sortedMessages.map(message => ({
                                ...message,
                                text: message.text ? String(message.text) : "",
                                html: message.html ? String(message.html) : "",
                                body: message.body ? String(message.body) : ""
                            }));
                            this.mainWindow.webContents.send('imap:emails-fetched', serializedMessages);
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