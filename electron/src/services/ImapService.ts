import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { BrowserWindow } from 'electron';
import { Stream } from 'stream';
import { hashSync } from 'bcrypt';

const Store = require('electron-store');

interface ImapConfig {
  host: string;
  port: number;
  tls: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface StoreConfig {
  imapConfig?: Partial<ImapConfig>;
}

const store = new Store();

export interface ImapEmail {
  id: string;
  from: string;
  subject: string;
  status: 'NEW' | 'MESSAGE_VIEWED';
  isEncrypted: boolean;
  date: Date;
  text?: string;
  html?: string | null;
}

function encryptPassword(password: string): Promise<string> {
  return Promise.resolve(hashSync(password, 10));
}

export class ImapService {
  private imap: Imap;
  private mainWindow: BrowserWindow;
  private isConnected: boolean = false;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  public async connect(config: {
    user: string;
    password: string;
    host?: string;
    port?: number;
  }) {
    // Save config (except password) for future use
    const imapConfig: ImapConfig = {
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

    // Improved IMAP connection with better error handling for Gmail
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host || 'imap.gmail.com',
      port: config.port || 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: true },
      authTimeout: 20000, // Increase timeout for slower connections
      connTimeout: 30000  // Connection timeout
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

      this.imap.once('error', (err: Error) => {
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

  public disconnect() {
    if (this.imap && this.isConnected) {
      this.imap.end();
    }
  }

  public async fetchPGPEmails() {
    if (!this.isConnected) {
      throw new Error('Not connected to IMAP server');
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) reject(err);

        // Enhanced search criteria to find PGP/GPG messages
        // This combines multiple search strategies to find as many encrypted messages as possible
        const searchCriteria = [
          ['OR',
            ['OR',
              ['BODY', 'BEGIN PGP MESSAGE'],
              ['BODY', 'BEGIN PGP SIGNED MESSAGE']
            ],
            ['OR',
              ['SUBJECT', 'PGP'],
              ['SUBJECT', 'GPG']
            ]
          ]
        ];

        this.imap.search(searchCriteria, (err, results) => {
          if (err) reject(err);
          if (!results || !results.length) {
            this.mainWindow.webContents.send('imap:emails-fetched', []);
            resolve([]);
            return;
          }

          const fetch = this.imap.fetch(results, {
            bodies: '',
            struct: true
          });

          const messages: ImapEmail[] = [];
          let processedCount = 0;

          fetch.on('message', (msg) => {
            msg.on('body', (stream: Stream) => {
              simpleParser(stream as any, async (err: Error | null, parsed: ParsedMail) => {
                if (err) reject(err);

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

  async saveImapConfig(config: ImapConfig) {
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