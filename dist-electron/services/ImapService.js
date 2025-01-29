"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImapService = void 0;
const imap_1 = __importDefault(require("imap"));
const mailparser_1 = require("mailparser");
class ImapService {
    imap;
    mainWindow;
    isConnected = false;
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
    }
    async connect(config) {
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
                resolve(true);
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
                        resolve([]);
                        return;
                    }
                    const fetch = this.imap.fetch(results, {
                        bodies: '',
                        struct: true
                    });
                    const messages = [];
                    fetch.on('message', (msg) => {
                        msg.on('body', (stream) => {
                            (0, mailparser_1.simpleParser)(stream, async (err, parsed) => {
                                if (err)
                                    reject(err);
                                messages.push({
                                    id: parsed.messageId,
                                    from: parsed.from,
                                    to: parsed.to,
                                    subject: parsed.subject,
                                    date: parsed.date,
                                    text: parsed.text,
                                    html: parsed.html,
                                    attachments: parsed.attachments
                                });
                            });
                        });
                    });
                    fetch.on('error', (err) => {
                        reject(err);
                    });
                    fetch.on('end', () => {
                        this.mainWindow.webContents.send('imap:emails-fetched', messages);
                        resolve(messages);
                    });
                });
            });
        });
    }
}
exports.ImapService = ImapService;
//# sourceMappingURL=ImapService.js.map