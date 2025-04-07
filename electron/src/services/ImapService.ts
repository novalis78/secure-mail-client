import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { BrowserWindow } from 'electron';
import { Stream } from 'stream';
import { hashSync } from 'bcrypt';

// Import store from a service manager to avoid direct instantiation
import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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

// Create a simple file-based storage instead of using electron-store directly
const getConfigPath = () => path.join(app.getPath('userData'), 'imap-config.json');

// Simple file-based config functions
const readConfig = () => {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading config:', error);
      return {};
    }
  }
  return {};
};

const writeConfig = (config: any) => {
  const configPath = getConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error writing config:', error);
  }
};

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
    } catch (error) {
      this.mainWindow.webContents.send('imap:error', error.message);
      throw error;
    }
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

          const messages: ImapEmail[] = [];
          let processedCount = 0;
          const messagePromises: Promise<void>[] = [];

          fetch.on('message', (msg) => {
            msg.on('body', (stream: Stream) => {
              const messagePromise = new Promise<void>((resolveMsg, rejectMsg) => {
                simpleParser(stream as any, async (err: Error | null, parsed: ParsedMail) => {
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
                    
                    // Look for Mailvelope signatures (common in forwarded messages)
                    text.includes('Version: Mailvelope') ||
                    html.includes('Version: Mailvelope') ||
                    
                    // Look for common forwarded message patterns with PGP content
                    text.includes('Forwarded message') && (
                      text.includes('BEGIN PGP') || 
                      text.includes('END PGP')
                    ) ||
                    
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

  async saveImapConfig(config: ImapConfig) {
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
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}