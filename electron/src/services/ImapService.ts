import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { BrowserWindow } from 'electron';
import { Stream } from 'stream';  // Add this import

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
    this.imap = new Imap({
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

        const searchCriteria = [
          ['OR',
            ['BODY', 'BEGIN PGP MESSAGE'],
            ['BODY', 'BEGIN PGP SIGNED MESSAGE']
          ]
        ];

        this.imap.search(searchCriteria, (err, results) => {
          if (err) reject(err);
          if (!results || !results.length) {
            resolve([]);
            return;
          }

          const fetch = this.imap.fetch(results, {
            bodies: '',
            struct: true
          });

          const messages: any[] = [];

          fetch.on('message', (msg) => {
            msg.on('body', (stream: Stream) => {  // Add type here
              simpleParser(stream as any, async (err: Error | null, parsed: ParsedMail) => {  // Cast stream as any
                if (err) reject(err);

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