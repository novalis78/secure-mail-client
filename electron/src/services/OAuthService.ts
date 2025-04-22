import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as querystring from 'querystring';
import { Credentials } from 'google-auth-library/build/src/auth/credentials';

export class OAuthService {
  private oauth2Client: OAuth2Client;
  private redirectUri: string = 'http://localhost:3000';
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
      // Try multiple possible paths for the credentials file
      const possiblePaths = [
        // production/packaged path
        path.join(__dirname, '../../../config/oauth/credentials.json'),
        // development path (from project root)
        path.join(process.cwd(), 'config/oauth/credentials.json'),
        // absolute path (for debugging)
        '/Users/novalis78/Projects/secure-mail-client/config/oauth/credentials.json'
      ];
      
      // Find the first path that exists
      let credentialsPath = '';
      for (const testPath of possiblePaths) {
        console.log('Checking path:', testPath);
        if (fs.existsSync(testPath)) {
          credentialsPath = testPath;
          console.log('Found credentials at:', credentialsPath);
          break;
        }
      }
      
      if (!credentialsPath) {
        throw new Error(`Credentials file not found. Tried paths: ${possiblePaths.join(', ')}`);
      }
      
      console.log('Loading OAuth credentials from:', credentialsPath);
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
  return new Promise((resolve, reject) => {
    try {
      // Create an HTTP server to receive the OAuth callback
      const http = require('http');
      const url = require('url');
      
      const server = http.createServer(async (req: any, res: any) => {
        try {
          // Parse the URL to get the authorization code
          const parsedUrl = url.parse(req.url, true);
          const code = parsedUrl.query.code;
          
          if (code) {
            // Send branded success response
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(`<html>
  <head>
    <title>Secure Mail Client - Authentication Successful</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #020617;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      .container {
        background-color: #0F172A;
        border-radius: 0.5rem;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
        max-width: 500px;
        width: 90%;
      }
      .logo {
        width: 80px;
        height: 80px;
        margin-bottom: 1rem;
      }
      h1 {
        color: #10b981;
        margin-bottom: 1rem;
      }
      p {
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }
      .btn {
        background-color: #10b981;
        color: white;
        padding: 0.625rem 1.25rem;
        border-radius: 0.375rem;
        display: inline-block;
        font-weight: 500;
        cursor: pointer;
        border: none;
        text-decoration: none;
      }
      .shield {
        font-size: 3rem;
        color: #10b981;
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <svg width="80" height="80" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
        <path d="M18 4.5L6 9V18C6 25.6 11.2 32.4 18 34.5C24.8 32.4 30 25.6 30 18V9L18 4.5Z" fill="#10b981" />
        <rect x="16" y="14" width="4" height="8" fill="#0F172A" />
      </svg>
      <h1>Authentication Successful</h1>
      <p>You have successfully authenticated with Secure Mail Client. You can now close this window and return to the application.</p>
      <button class="btn" onclick="window.close()">Close Window</button>
    </div>
  </body>
</html>`);
            
            // Close the server
            server.close();
            
            try {
              // Exchange code for tokens
              const { tokens } = await this.oauth2Client.getToken(code);
              
              // Set credentials and save token
              this.oauth2Client.setCredentials(tokens);
              await this.saveToken(tokens);
              this.isAuthenticated = true;
              
              resolve({ success: true });
            } catch (error) {
              console.error('Error getting tokens:', error);
              reject({ success: false, error: `Failed to get tokens: ${error.message}` });
            }
          } else {
            // No code in the callback - branded error page
            res.writeHead(400, {'Content-Type': 'text/html'});
            res.end(`<html>
  <head>
    <title>Secure Mail Client - Authentication Failed</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #020617;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      .container {
        background-color: #0F172A;
        border-radius: 0.5rem;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
        max-width: 500px;
        width: 90%;
      }
      h1 {
        color: #ff4d4d;
        margin-bottom: 1rem;
      }
      p {
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }
      .btn {
        background-color: #10b981;
        color: white;
        padding: 0.625rem 1.25rem;
        border-radius: 0.375rem;
        display: inline-block;
        font-weight: 500;
        cursor: pointer;
        border: none;
        text-decoration: none;
      }
      .error-icon {
        font-size: 3rem;
        color: #ff4d4d;
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-icon">⚠️</div>
      <h1>Authentication Failed</h1>
      <p>No authorization code was received. Please try again or contact support if the issue persists.</p>
      <button class="btn" onclick="window.close()">Close Window</button>
    </div>
  </body>
</html>`);
            server.close();
            reject({ success: false, error: 'No authorization code received' });
          }
        } catch (error) {
          console.error('Error in auth callback:', error);
          res.writeHead(500, {'Content-Type': 'text/html'});
          res.end(`<html>
  <head>
    <title>Secure Mail Client - Authentication Error</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        background-color: #020617;
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      .container {
        background-color: #0F172A;
        border-radius: 0.5rem;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
        max-width: 500px;
        width: 90%;
      }
      h1 {
        color: #ff4d4d;
        margin-bottom: 1rem;
      }
      p {
        margin-bottom: 1.5rem;
        line-height: 1.5;
      }
      .btn {
        background-color: #10b981;
        color: white;
        padding: 0.625rem 1.25rem;
        border-radius: 0.375rem;
        display: inline-block;
        font-weight: 500;
        cursor: pointer;
        border: none;
        text-decoration: none;
      }
      .error-icon {
        font-size: 3rem;
        color: #ff4d4d;
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-icon">❌</div>
      <h1>Authentication Error</h1>
      <p>An unexpected error occurred during authentication. Please try again later or contact support.</p>
      <button class="btn" onclick="window.close()">Close Window</button>
    </div>
  </body>
</html>`);
          server.close();
          reject({ success: false, error: `Authentication error: ${error.message}` });
        }
      });
      
      // Start the server on port 3000
      server.listen(3000, 'localhost', () => {
        console.log('Authentication server listening on port 3000');
        
        // Generate the auth URL
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: this.scopes,
          prompt: 'consent'  // Force to get refresh token
        });
        
        // Open the URL in the default browser
        const { shell } = require('electron');
        shell.openExternal(authUrl);
        
        // Handle server timeout (e.g., after 2 minutes)
        setTimeout(() => {
          if (server.listening) {
            server.close();
            reject({ success: false, error: 'Authentication timed out' });
          }
        }, 120000); // 2 minutes timeout
      });
    } catch (error) {
      console.error('Error setting up authentication:', error);
      reject({ success: false, error: `Authentication setup failed: ${error.message}` });
    }
  });
}







  /**
   * Logout and revoke tokens
   */
  public async logout(): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      if (this.isAuthenticated && this.oauth2Client.credentials.access_token) {
        try {
          // Try to revoke the token, but don't fail if this doesn't work
          // Token might already be expired or revoked
          await this.oauth2Client.revokeToken(
            this.oauth2Client.credentials.access_token as string
          );
          console.log('Token successfully revoked');
        } catch (revokeError) {
          // Just log the error but continue with logout process
          // This is likely an "invalid_token" error when token is already expired
          console.error('OAuth token revocation error:', revokeError);
          console.log('Continuing with logout process despite token revocation error');
        }
      }
      
      // Always clear saved token and set as not authenticated
      // This ensures the user is logged out locally even if token revocation failed
      this.clearToken();
      this.isAuthenticated = false;
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('OAuth logout error:', error);
      return {
        success: false,
        error: `Logout failed: ${error.message}`
      };
    }
  }

  /**
   * Mark an email as read/unread using Gmail API
   */
  public async markEmailReadStatus(messageId: string, markAsRead: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please authenticate first.');
      }
      
      // Refresh token if needed
      await this.refreshTokenIfNeeded();
      
      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Add or remove the UNREAD label
      const requestBody: any = {
        removeLabelIds: [],
        addLabelIds: []
      };

      if (markAsRead) {
        requestBody.removeLabelIds = ['UNREAD'];
      } else {
        requestBody.addLabelIds = ['UNREAD'];
      }
      
      // Modify the message labels
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody
      });
      
      return { 
        success: true 
      };
    } catch (error) {
      console.error('Error modifying email read status:', error);
      return {
        success: false,
        error: `Failed to modify email: ${error.message}`
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
      
      // Fetch encrypted emails across all folders including SENT
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: '("BEGIN PGP MESSAGE" OR "BEGIN PGP SIGNED MESSAGE") in:anywhere',
        maxResults: 30
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
            
            // Determine folder from labelIds
            let folder = 'INBOX';
            const labelIds = fullMessage.data.labelIds || [];
            
            if (labelIds.includes('SENT')) {
              folder = 'SENT';
            } else if (labelIds.includes('DRAFT')) {
              folder = 'DRAFT';
            } else if (labelIds.includes('TRASH')) {
              folder = 'TRASH';
            } else if (labelIds.includes('SPAM')) {
              folder = 'SPAM';
            }
            
            return {
              id: message.id,
              threadId: message.threadId,
              subject,
              from,
              date,
              body,
              snippet: fullMessage.data.snippet,
              isPGP,
              labelIds,
              folder
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
  public async sendEmail(params: { 
    to: string, 
    subject: string, 
    body: string,
    attachments?: Array<{
      filename: string;
      contentType: string;
      content: string;
    }>
  } | string, subject?: string, body?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please authenticate first.');
      }
      
      // Handle both overloaded versions
      let to: string;
      let emailSubject: string;
      let emailBody: string;
      let attachments: Array<{
        filename: string;
        contentType: string;
        content: string;
      }> = [];
      
      // Check which version was called
      if (typeof params === 'string') {
        // Legacy version with individual parameters
        to = params;
        emailSubject = subject || '';
        emailBody = body || '';
      } else {
        // New version with object parameter
        to = params.to;
        emailSubject = params.subject;
        emailBody = params.body;
        attachments = params.attachments || [];
      }
      
      // Refresh token if needed
      await this.refreshTokenIfNeeded();
      
      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Generate a boundary for multipart messages
      const boundary = `----EmailBoundary_${Date.now().toString(16)}`;
      
      // Create email headers
      const headers = [
        `To: ${to}`,
        `Subject: ${emailSubject}`,
        'MIME-Version: 1.0'
      ];
      
      // Check if we have attachments
      if (attachments.length > 0) {
        headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      } else {
        headers.push('Content-Type: text/plain; charset=utf-8');
      }
      
      // Create email content
      let emailContent = headers.join('\r\n') + '\r\n\r\n';
      
      // Add body and attachments if any
      if (attachments.length > 0) {
        // Start with the text part
        emailContent += `--${boundary}\r\n`;
        emailContent += 'Content-Type: text/plain; charset=utf-8\r\n\r\n';
        emailContent += emailBody + '\r\n\r\n';
        
        // Add each attachment
        for (const attachment of attachments) {
          emailContent += `--${boundary}\r\n`;
          emailContent += `Content-Type: ${attachment.contentType}\r\n`;
          emailContent += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n\r\n`;
          emailContent += attachment.content + '\r\n\r\n';
        }
        
        // Close the boundary
        emailContent += `--${boundary}--\r\n`;
      } else {
        // Simple email with just text body
        emailContent += emailBody;
      }
      
      // Detect if this is a PGP message and adjust content type if needed
      const isPGPMessage = emailBody.includes('-----BEGIN PGP MESSAGE-----');
      const isPGPSignedMessage = emailBody.includes('-----BEGIN PGP SIGNED MESSAGE-----');
      
      if (isPGPMessage || isPGPSignedMessage) {
        console.log('[OAuthService] Detected PGP content, adjusting email format');
      }
      
      // Log email structure for debugging
      console.log('[OAuthService] Email structure:', {
        to,
        subject: emailSubject,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length,
        isPGPMessage,
        isPGPSignedMessage
      });
      
      // Encode to base64
      const encodedEmail = Buffer.from(emailContent).toString('base64')
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
      
      // Use ipcMain to listen for responses from the renderer
      const { ipcMain } = require('electron');
      
      const codeResponseHandler = (_event: any, code: string) => {
        ipcMain.removeListener('oauth:code-response', codeResponseHandler);
        ipcMain.removeListener('oauth:code-cancelled', codeCancelledHandler);
        resolve(code);
      };
      
      const codeCancelledHandler = () => {
        ipcMain.removeListener('oauth:code-response', codeResponseHandler);
        ipcMain.removeListener('oauth:code-cancelled', codeCancelledHandler);
        resolve('');
      };
      
      ipcMain.once('oauth:code-response', codeResponseHandler);
      ipcMain.once('oauth:code-cancelled', codeCancelledHandler);
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
        
        // Use the refresh token to get new access token
        if (!credentials.refresh_token) {
          throw new Error('No refresh token available');
        }
        
        // Create a new OAuth2Client instance for refreshing the token
        const { google } = require('googleapis');
        const refreshClient = new google.auth.OAuth2(
          this.credentials.installed.client_id,
          this.credentials.installed.client_secret,
          this.redirectUri
        );
        
        // Set the refresh token
        refreshClient.setCredentials({
          refresh_token: credentials.refresh_token
        });
        
        // Get a new access token
        const response = await refreshClient.getAccessToken();
        const newToken = response.token;
        const newExpiry = Date.now() + 3600 * 1000; // Set expiry to 1 hour from now
        
        // Create new credentials
        const newCredentials = {
          ...credentials,
          access_token: newToken,
          expiry_date: newExpiry
        };
        
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
