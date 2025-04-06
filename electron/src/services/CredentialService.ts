import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

// Replace electron-store with direct file storage
const getConfigPath = () => path.join(app.getPath('userData'), 'credentials.json');

// Simple file-based config functions
const readConfig = () => {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Error reading credential config:', error);
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
    console.error('Error writing credential config:', error);
  }
};

export interface Credentials {
  email?: string;
  password?: string;
  host?: string;
  port?: number;
  encryption?: 'ssl' | 'tls' | 'none';
  encryptionMethod?: 'pgp' | 'yubikey' | 'none';
}

export class CredentialService {
  private encryptionKey: Buffer | null = null;
  private yubiKeyConnected: boolean = false;
  private envPath: string;

  constructor() {
    // Path for the .env file
    this.envPath = path.join(app.getPath('userData'), '.env');
    
    // Try to load from .env file first
    this.loadEnvFile();
    
    // Initialize encryption key before we try to use the store
    this.generateTempEncryptionKey();
    
    // Ensure the userData directory exists
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
  }

  /**
   * Load credentials from .env file if it exists
   */
  private loadEnvFile(): void {
    // First check project root for .env
    if (fs.existsSync(path.join(process.cwd(), '.env'))) {
      dotenv.config();
    } 
    // Then check user data directory
    else if (fs.existsSync(this.envPath)) {
      dotenv.config({ path: this.envPath });
    }
  }

  /**
   * Generate a temporary encryption key (until YubiKey integration is complete)
   */
  private generateTempEncryptionKey(): void {
    // For now, we'll use a machine-specific value but in the future,
    // this would be derived from the YubiKey or user's PGP key
    const machineId = this.getMachineSpecificId();
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(machineId)
      .digest();
    
    // We're now using file-based config, so no need to update store.encryptionKey
  }

  /**
   * Get a somewhat unique machine ID (not perfect but better than a hardcoded value)
   */
  private getMachineSpecificId(): string {
    // This is a simplified version - in a real app we'd use more robust methods
    const homeDir = app.getPath('home');
    const username = path.basename(homeDir);
    const hostname = require('os').hostname();
    
    return `${username}-${hostname}-secure-mail-client`;
  }

  /**
   * When a YubiKey is connected, use it to derive the encryption key
   */
  public setYubiKeyConnected(connected: boolean, yubiKeyId?: string): void {
    this.yubiKeyConnected = connected;
    
    if (connected && yubiKeyId) {
      // In a real implementation, we would derive an encryption key from the YubiKey
      // For now, we'll simulate this with a different value
      const yubiKeyBasedKey = crypto
        .createHash('sha256')
        .update(`yubikey-${yubiKeyId}-${this.getMachineSpecificId()}`)
        .digest();
      
      this.encryptionKey = yubiKeyBasedKey;
      // We're now using file-based config, so no need to update store.encryptionKey
    } else {
      // Fall back to machine-specific key if YubiKey is disconnected
      this.generateTempEncryptionKey();
    }
  }

  /**
   * Save Gmail credentials
   */
  public saveGmailCredentials(email: string, appPassword: string): void {
    // Save to encrypted file storage
    const config = readConfig();
    
    config.credentials = config.credentials || {};
    config.credentials.gmail = {
      email,
      password: this.encrypt(appPassword),
      host: 'imap.gmail.com',
      port: 993,
      encryption: 'ssl'
    };
    
    writeConfig(config);
    
    // Optionally also update .env file
    this.updateEnvFile('GMAIL_EMAIL', email);
    // We don't save the password to the .env file for additional security
  }

  /**
   * Get Gmail credentials
   */
  public getGmailCredentials(): Credentials | null {
    const config = readConfig();
    const credentials = config.credentials?.gmail;
    
    if (!credentials) {
      // Try to get from environment variables
      const email = process.env.GMAIL_EMAIL;
      const password = process.env.GMAIL_APP_PASSWORD;
      
      if (email && password) {
        return {
          email,
          password,
          host: 'imap.gmail.com',
          port: 993,
          encryption: 'ssl' as 'ssl'
        };
      }
      
      return null;
    }
    
    try {
      return {
        ...credentials,
        password: credentials.password ? this.decrypt(credentials.password) : undefined
      };
    } catch (error) {
      console.error('Error decrypting Gmail credentials, returning email only:', error);
      // If we can't decrypt the password, at least return the email
      return {
        ...credentials,
        password: undefined
      };
    }
  }

  /**
   * Save custom IMAP credentials
   */
  public saveImapCredentials(credentials: Credentials): void {
    if (!credentials.email || !credentials.password || !credentials.host || !credentials.port) {
      throw new Error('Missing required IMAP credentials');
    }
    
    const config = readConfig();
    config.credentials = config.credentials || {};
    config.credentials.imap = {
      ...credentials,
      password: this.encrypt(credentials.password)
    };
    
    writeConfig(config);
  }

  /**
   * Get custom IMAP credentials
   */
  public getImapCredentials(): Credentials | null {
    const config = readConfig();
    const credentials = config.credentials?.imap;
    
    if (!credentials) {
      // Try to get from environment variables
      const host = process.env.IMAP_HOST;
      const port = process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT) : undefined;
      const user = process.env.IMAP_USER;
      const password = process.env.IMAP_PASSWORD;
      
      if (host && port && user && password) {
        return {
          email: user,
          password,
          host,
          port,
          encryption: 'ssl' as 'ssl'
        };
      }
      
      return null;
    }
    
    try {
      return {
        ...credentials,
        password: credentials.password ? this.decrypt(credentials.password) : undefined
      };
    } catch (error) {
      console.error('Error decrypting IMAP credentials, returning without password:', error);
      // If we can't decrypt the password, at least return the other fields
      return {
        ...credentials,
        password: undefined
      };
    }
  }

  /**
   * Clear all stored credentials
   */
  public clearAllCredentials(): void {
    const config = readConfig();
    delete config.credentials;
    writeConfig(config);
  }

  /**
   * Encrypt a value
   */
  private encrypt(text: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt a value
   */
  private decrypt(encryptedText: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }
    
    const [ivHex, encryptedHex] = encryptedText.split(':');
    if (!ivHex || !encryptedHex) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Update a value in the .env file
   */
  private updateEnvFile(key: string, value: string): void {
    try {
      let envContent = '';
      
      // Read existing content if file exists
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }
      
      // Check if key already exists
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        // Update existing key
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new key
        envContent += `\n${key}=${value}`;
      }
      
      // Write back to file
      fs.writeFileSync(this.envPath, envContent.trim());
    } catch (error) {
      console.error('Error updating .env file:', error);
    }
  }
}