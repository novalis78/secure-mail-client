import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as querystring from 'querystring';
import { Credentials } from 'google-auth-library/build/src/auth/credentials';

export class OAuthService {
  private oauth2Client: OAuth2Client;
  private redirectUri: string = 'urn:ietf:wg:oauth:2.0:oob';
  private tokenFilePath: string;
  private credentials: any;
  private isAuthenticated: boolean = false;
  private mainWindow: BrowserWindow;
  private scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.tokenFilePath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.secure-mail-client', 'oauth-token.json');
    
    try {
      // Load credentials from the credentials.json file
      const credentialsPath = path.join(__dirname, '../../../config/oauth/credentials.json');
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      this.credentials = JSON.parse(credentialsContent);
      
      // Create OAuth2 client
      const { client_id, client_secret } = this.credentials.installed;
      this.oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        this.redirectUri
      );
      
      // Try to load existing token
      this.loadTokenIfExists();
      
      console.log('OAuth service initialized successfully');
    } catch (error) {
      console.error('Error initializing OAuth service:', error);
      throw new Error(`Failed to initialize OAuth service: ${error.message}`);
    }
  }

  /**
   * Check if the user is currently authenticated
   */
  public checkAuthentication(): { success: boolean; isAuthenticated: boolean; error?: string } {
    try {
      return {
        success: true,
        isAuthenticated: this.isAuthenticated
      };
    } catch (error) {
      return {
        success: false,
        isAuthenticated: false,
        error: error.message
      };
    }
  }

  /**
   * Start the OAuth authentication process
   */
  public async authenticate(): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate the authorization URL
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: this.scopes,
        prompt: 'consent'  // Force re-consent to get refresh token
      });

      // For desktop apps with OOB flow:
      // 1. We'll open the auth URL in an external browser
      const { shell } = require('electron');
      shell.openExternal(authUrl);
      
      // 2. Then prompt the user to enter the code they receive in a dialog
      const code = await this.promptForCode();
      
      if (!code) {
        throw new Error('Authentication was cancelled or no code was provided');
      }
      
      // 3. Exchange the code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      // 4. Set credentials and save token
      this.oauth2Client.setCredentials(tokens);
      await this.saveToken(tokens);
      this.isAuthenticated = true;
      
      return { success: true };
    } catch (error) {
      console.error('OAuth authentication error:', error);
      return {
        success: false,
        error: `Authentication failed: ${error.message}`
      };
    }
  }

  /**
   * Logout and revoke tokens
   */
  public async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isAuthenticated && this.oauth2Client.credentials.access_token) {
        // Revoke the token
        await this.oauth2Client.revokeToken(
          this.oauth2Client.credentials.access_token as string
        );
      }
      
      // Clear saved token
      this.clearToken();
      this.isAuthenticated = false;
      
      return { success: true };
    } catch (error) {
      console.error('OAuth logout error:', error);
      return {
        success: false,
        error: `Logout failed: ${error.message}`
      };
    }
  }

  /**
   * Fetch emails using Gmail API
   */
  public async fetchEmails(): Promise<{ success: boolean; emails?: any[]; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please authenticate first.');
      }
      
      // Refresh token if needed
      await this.refreshTokenIfNeeded();
      
      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Fetch encrypted emails (look for PGP headers)
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: 'has:attachment "BEGIN PGP MESSAGE" OR "BEGIN PGP SIGNED MESSAGE"',
        maxResults: 20
      });
      
      if (!res.data.messages || res.data.messages.length === 0) {
        return { success: true, emails: [] };
      }
      
      // Get full message details for each message
      const emails = await Promise.all(
        res.data.messages.map(async (message) => {
          try {
            const fullMessage = await gmail.users.messages.get({
              userId: 'me',
              id: message.id as string,
              format: 'full'
            });
            
            // Extract headers
            const headers = fullMessage.data.payload?.headers;
            const subject = headers?.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers?.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const date = headers?.find(h => h.name === 'Date')?.value || '';
            
            // Extract message body (PGP content)
            let body = '';
            
            // Check if the message has parts
            if (fullMessage.data.payload?.parts) {
              // Find the text part
              const textPart = fullMessage.data.payload.parts.find(
                part => part.mimeType === 'text/plain'
              );
              
              if (textPart && textPart.body?.data) {
                // Decode base64 content
                body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
              }
            } else if (fullMessage.data.payload?.body?.data) {
              // If no parts, get the body directly
              body = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf8');
            }
            
            // Look for PGP block in the body
            const pgpMatch = body.match(/-----BEGIN PGP (MESSAGE|SIGNED MESSAGE)-----([\s\S]*?)-----END PGP (MESSAGE|SIGNED MESSAGE)-----/);
            const isPGP = !!pgpMatch;
            
            return {
              id: message.id,
              threadId: message.threadId,
              subject,
              from,
              date,
              body,
              snippet: fullMessage.data.snippet,
              isPGP,
              labelIds: fullMessage.data.labelIds
            };
          } catch (err) {
            console.error(`Error fetching message ${message.id}:`, err);
            return null;
          }
        })
      );
      
      // Filter out any failed message fetches
      const validEmails = emails.filter(email => email !== null);
      
      return { success: true, emails: validEmails };
    } catch (error) {
      console.error('Error fetching emails with OAuth:', error);
      return {
        success: false,
        error: `Failed to fetch emails: ${error.message}`
      };
    }
  }

  /**
   * Send an email using Gmail API
   */
  public async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please authenticate first.');
      }
      
      // Refresh token if needed
      await this.refreshTokenIfNeeded();
      
      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Create email (RFC 5322 format)
      const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body
      ];
      
      // Join with proper line endings
      const email = emailLines.join('\r\n');
      
      // Encode to base64
      const encodedEmail = Buffer.from(email).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Send the email
      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error sending email with OAuth:', error);
      return {
        success: false,
        error: `Failed to send email: ${error.message}`
      };
    }
  }

  // Helper methods

  /**
   * Prompt user to enter the authorization code
   */
  private async promptForCode(): Promise<string> {
    return new Promise((resolve) => {
      // Send a message to the renderer to show a code input dialog
      this.mainWindow.webContents.send('oauth:code-prompt');
      
      // Listen for the code response
      const cleanup = () => {
        this.mainWindow.webContents.removeAllListeners('oauth:code-response');
      };
      
      this.mainWindow.webContents.on('oauth:code-response', (_, code: string) => {
        cleanup();
        resolve(code);
      });
      
      // Also handle cancellation
      this.mainWindow.webContents.on('oauth:code-cancelled', () => {
        cleanup();
        resolve('');
      });
    });
  }

  /**
   * Refresh token if it's expired or about to expire
   */
  private async refreshTokenIfNeeded(): Promise<void> {
    const credentials = this.oauth2Client.credentials;
    
    // If there's no expiry_date or it's expired, refresh the token
    if (!credentials.expiry_date || credentials.expiry_date <= Date.now()) {
      try {
        console.log('Refreshing expired OAuth token');
        const { credentials: newCredentials } = await this.oauth2Client.refreshToken(
          credentials.refresh_token as string
        );
        
        // Update credentials and save
        this.oauth2Client.setCredentials(newCredentials);
        await this.saveToken(newCredentials);
      } catch (error) {
        console.error('Error refreshing token:', error);
        // If refresh fails, we need to re-authenticate
        this.isAuthenticated = false;
        throw new Error('Authentication expired. Please re-authenticate.');
      }
    }
  }

  /**
   * Save OAuth token to disk
   */
  private async saveToken(tokens: Credentials): Promise<void> {
    try {
      // Ensure directory exists
      const tokenDir = path.dirname(this.tokenFilePath);
      if (!fs.existsSync(tokenDir)) {
        fs.mkdirSync(tokenDir, { recursive: true });
      }
      
      // Write token to file
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens));
      console.log('Token saved to', this.tokenFilePath);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  /**
   * Load existing token from disk
   */
  private loadTokenIfExists(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        const tokenContent = fs.readFileSync(this.tokenFilePath, 'utf8');
        const tokens = JSON.parse(tokenContent);
        
        // Set credentials on the client
        this.oauth2Client.setCredentials(tokens);
        
        // Check if we have an access token and it's not expired
        if (tokens.access_token) {
          this.isAuthenticated = true;
          
          // Check if token is expired
          if (tokens.expiry_date && tokens.expiry_date <= Date.now()) {
            // Token is expired, but we have a refresh token
            if (tokens.refresh_token) {
              console.log('Found expired token with refresh token');
            } else {
              // Token expired and no refresh token, need to re-authenticate
              this.isAuthenticated = false;
            }
          }
        }
        
        console.log('OAuth token loaded successfully. Authenticated:', this.isAuthenticated);
      }
    } catch (error) {
      console.error('Error loading token:', error);
      this.isAuthenticated = false;
    }
  }

  /**
   * Clear saved token
   */
  private clearToken(): void {
    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
        console.log('Token file deleted');
      }
      // Reset OAuth client credentials
      this.oauth2Client.credentials = {};
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }
}