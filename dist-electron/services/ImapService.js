"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapService = void 0;
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
const bcrypt_1 = require("bcrypt");
const Store = require('electron-store');
const store = new Store();
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
        // Save config (except password) for future use
        const imapConfig = {
            host: config.host || 'imap.gmail.com',
            port: config.port || 993,
            tls: true,
            auth: {
                user: config.user,
                pass: '' // We don't store the password here
            }
        };
        store.set('imapConfig', imapConfig);
        this.mainWindow.webContents.send('imap:status', 'Connecting to server...');
        this.imap = new imap_1.default({
            user: config.user,
            password: config.password,
            host: config.host || 'imap.gmail.com',
            port: config.port || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: true }
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
                if (err)
                    reject(err);
                const searchCriteria = [
                    ['OR',
                        ['BODY', 'BEGIN PGP MESSAGE'],
                        ['BODY', 'BEGIN PGP SIGNED MESSAGE']
                    ]
                ];
                this.imap.search(searchCriteria, (err, results) => {
                    if (err)
                        reject(err);
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
                    fetch.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                                if (err)
                                    reject(err);
                                processedCount++;
                                this.mainWindow.webContents.send('imap:progress', {
                                    current: processedCount,
                                    total: results.length
                                });
                                const isPGP = (parsed.text || '').includes('BEGIN PGP MESSAGE') ||
                                    (parsed.text || '').includes('BEGIN PGP SIGNED MESSAGE');
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
                            });
                        });
                    });
                    fetch.on('error', (err) => {
                        reject(err);
                    });
                    fetch.on('end', () => {
                        const sortedMessages = messages.sort((a, b) => b.date.getTime() - a.date.getTime());
                        this.mainWindow.webContents.send('imap:emails-fetched', sortedMessages);
                        resolve(sortedMessages);
                    });
                });
            });
        });
    }
    async saveImapConfig(config) {
        const validatedConfig = {
            host: config.host,
            port: config.port,
            tls: config.tls,
            auth: {
                user: config.auth.user,
                pass: config.auth.pass
            }
        };
        const encryptedPassword = await encryptPassword(validatedConfig.auth.pass);
        store.set('imapConfig', {
            host: validatedConfig.host,
            port: validatedConfig.port,
            tls: validatedConfig.tls,
            auth: {
                user: validatedConfig.auth.user,
                pass: encryptedPassword
            }
        });
        return { success: true };
    }
}
exports.ImapService = ImapService;
//# sourceMappingURL=ImapService.js.map