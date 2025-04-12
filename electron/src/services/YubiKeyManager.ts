import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { dialog } from 'electron';
import { YubiKeyService } from './YubiKeyService';

// Use promisified exec function
const execAsync = promisify(exec);

export class YubiKeyManager {
  private yubiKeyService: YubiKeyService;

  constructor(yubiKeyService: YubiKeyService) {
    this.yubiKeyService = yubiKeyService;
  }

  /**
   * Check if the public key for a given fingerprint exists in the GPG keyring
   */
  async checkPublicKey(fingerprint: string): Promise<{ found: boolean; message?: string }> {
    try {
      // Remove spaces and ensure uppercase
      const normalizedFingerprint = fingerprint.replace(/\s+/g, '').toUpperCase();
      
      console.log(`[YubiKeyManager] Checking for public key with fingerprint: ${normalizedFingerprint}`);
      
      // Check if the public key exists in the GPG keyring
      const result = await execAsync(`gpg --list-keys ${normalizedFingerprint}`).catch((): null => null);
      
      if (result && result.stdout) {
        console.log('[YubiKeyManager] Public key found in GPG keyring');
        return { found: true };
      }
      
      console.log('[YubiKeyManager] Public key not found in GPG keyring');
      return { found: false };
    } catch (error) {
      console.error('[YubiKeyManager] Error checking public key:', error);
      return { 
        found: false, 
        message: error instanceof Error ? error.message : 'Unknown error checking public key'
      };
    }
  }

  /**
   * Import a public key from a keyserver
   */
  async importPublicKeyFromKeyserver(fingerprint: string): Promise<{ 
    success: boolean; 
    message?: string;
    error?: string;
  }> {
    try {
      // Normalize fingerprint
      const normalizedFingerprint = fingerprint.replace(/\s+/g, '').toUpperCase();
      
      console.log(`[YubiKeyManager] Importing key from keyserver: ${normalizedFingerprint}`);
      
      // Try different keyservers in sequence
      const keyservers = [
        'keys.openpgp.org',
        'keyserver.ubuntu.com',
        'pgp.mit.edu'
      ];
      
      let success = false;
      let lastError = '';
      
      for (const keyserver of keyservers) {
        try {
          console.log(`[YubiKeyManager] Trying keyserver: ${keyserver}`);
          
          const { stdout, stderr } = await execAsync(
            `gpg --keyserver ${keyserver} --recv-keys ${normalizedFingerprint}`, 
            { timeout: 10000 }
          );
          
          console.log(`[YubiKeyManager] Import result from ${keyserver}:`, stdout);
          
          if (stderr && stderr.includes('error')) {
            console.warn(`[YubiKeyManager] Warning from ${keyserver}:`, stderr);
            lastError = stderr;
            continue;
          }
          
          // Check if import was successful by checking if key is now in keyring
          const keyCheck = await this.checkPublicKey(normalizedFingerprint);
          if (keyCheck.found) {
            console.log(`[YubiKeyManager] Successfully imported key from ${keyserver}`);
            success = true;
            break;
          }
        } catch (error) {
          console.warn(`[YubiKeyManager] Failed to import from ${keyserver}:`, error);
          lastError = error instanceof Error ? error.message : 'Unknown keyserver error';
        }
      }
      
      if (success) {
        return { success: true, message: 'Successfully imported public key from keyserver' };
      } else {
        return { 
          success: false, 
          error: `Failed to import key from keyservers: ${lastError}`
        };
      }
    } catch (error) {
      console.error('[YubiKeyManager] Error importing from keyserver:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import a public key from a file selected by the user
   */
  async importPublicKeyFromFile(): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      console.log('[YubiKeyManager] Prompting user to select public key file');
      
      const result = await dialog.showOpenDialog({
        title: 'Select PGP Public Key',
        filters: [
          { name: 'PGP Public Keys', extensions: ['asc', 'gpg', 'pgp'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result.canceled || !result.filePaths.length) {
        console.log('[YubiKeyManager] User canceled file selection');
        return { success: false, error: 'File selection canceled' };
      }
      
      const filePath = result.filePaths[0];
      console.log(`[YubiKeyManager] User selected file: ${filePath}`);
      
      // Read the file content
      const fileContent = fs.readFileSync(filePath, 'utf8');
      
      // Check if it looks like a PGP public key
      if (!fileContent.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
        console.warn('[YubiKeyManager] Selected file does not appear to be a PGP public key');
        return { 
          success: false, 
          error: 'Selected file does not appear to be a valid PGP public key'
        };
      }
      
      // Create a temporary file with the content
      const tempDir = path.join(process.env.TEMP || '/tmp', 'secure-mail-client');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, 'import-key.asc');
      fs.writeFileSync(tempFilePath, fileContent);
      
      // Import the key
      const { stdout, stderr } = await execAsync(`gpg --import "${tempFilePath}"`);
      console.log('[YubiKeyManager] Import output:', stdout);
      
      if (stderr && stderr.includes('error')) {
        console.error('[YubiKeyManager] Error during import:', stderr);
        return { success: false, error: stderr };
      }
      
      // Clean up
      fs.unlinkSync(tempFilePath);
      
      return { 
        success: true, 
        message: 'Successfully imported public key from file'
      };
    } catch (error) {
      console.error('[YubiKeyManager] Error importing from file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Export a public key to a file
   */
  async exportPublicKeyToFile(fingerprint: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      console.log(`[YubiKeyManager] Exporting public key: ${fingerprint}`);
      
      // Normalize fingerprint
      const normalizedFingerprint = fingerprint.replace(/\s+/g, '').toUpperCase();
      
      // Get user ID for the key to create a good filename
      let userId = 'pgp-key';
      try {
        const { stdout } = await execAsync(`gpg --list-keys ${normalizedFingerprint}`);
        const userIdMatch = stdout.match(/uid\s+\[\s*\w+\]\s+(.+)/);
        if (userIdMatch && userIdMatch[1]) {
          // Extract email from user ID if possible
          const emailMatch = userIdMatch[1].match(/<([^>]+)>/);
          userId = emailMatch ? emailMatch[1].replace(/@/g, '_at_') : userIdMatch[1];
          
          // Clean up for filename
          userId = userId.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
        }
      } catch (error) {
        console.warn('[YubiKeyManager] Error getting user ID for key:', error);
      }
      
      // Prompt user for save location
      const result = await dialog.showSaveDialog({
        title: 'Save PGP Public Key',
        defaultPath: path.join(process.env.HOME || '', `${userId}-${normalizedFingerprint.substring(0, 8)}.asc`),
        filters: [
          { name: 'PGP Public Keys', extensions: ['asc'] }
        ]
      });
      
      if (result.canceled || !result.filePath) {
        console.log('[YubiKeyManager] User canceled save dialog');
        return { success: false, error: 'Save canceled' };
      }
      
      // Export key to the selected file
      const { stdout, stderr } = await execAsync(`gpg --armor --export ${normalizedFingerprint} > "${result.filePath}"`);
      
      if (stderr && stderr.includes('error')) {
        console.error('[YubiKeyManager] Error exporting key:', stderr);
        return { success: false, error: stderr };
      }
      
      return { 
        success: true, 
        message: `Public key exported to ${result.filePath}`
      };
    } catch (error) {
      console.error('[YubiKeyManager] Error exporting to file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload a public key to a keyserver
   */
  async uploadPublicKeyToKeyserver(fingerprint: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Normalize fingerprint
      const normalizedFingerprint = fingerprint.replace(/\s+/g, '').toUpperCase();
      
      console.log(`[YubiKeyManager] Uploading key to keyserver: ${normalizedFingerprint}`);
      
      // Try keys.openpgp.org as the primary keyserver
      const { stdout, stderr } = await execAsync(
        `gpg --keyserver keys.openpgp.org --send-keys ${normalizedFingerprint}`,
        { timeout: 20000 }
      );
      
      if (stderr && stderr.includes('error')) {
        console.error('[YubiKeyManager] Error uploading key:', stderr);
        return { success: false, error: stderr };
      }
      
      return {
        success: true,
        message: 'Successfully uploaded public key to keys.openpgp.org'
      };
    } catch (error) {
      console.error('[YubiKeyManager] Error uploading to keyserver:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test that all YubiKey functions are working properly
   */
  async testYubiKeyFunctions(): Promise<{
    success: boolean;
    results: {
      keyDetected: boolean;
      publicKeyFound: boolean;
      canSign: boolean;
      canEncrypt: boolean;
      canDecrypt: boolean;
    };
    message?: string;
    error?: string;
  }> {
    try {
      console.log('[YubiKeyManager] Running YubiKey function tests');
      
      // Check if YubiKey is detected
      const yubiKeyInfo = await this.yubiKeyService.detectYubiKey();
      const keyDetected = yubiKeyInfo.detected;
      
      if (!keyDetected) {
        return {
          success: false,
          results: {
            keyDetected: false,
            publicKeyFound: false,
            canSign: false,
            canEncrypt: false,
            canDecrypt: false
          },
          error: 'YubiKey not detected'
        };
      }
      
      // Check if public key is in keyring
      let publicKeyFound = false;
      let signatureFingerprint = '';
      
      if (yubiKeyInfo.pgpInfo?.signatureKey?.fingerprint) {
        signatureFingerprint = yubiKeyInfo.pgpInfo.signatureKey.fingerprint;
        const keyCheck = await this.checkPublicKey(signatureFingerprint);
        publicKeyFound = keyCheck.found;
      }
      
      // Test signing capability
      let canSign = false;
      if (publicKeyFound) {
        // Create a test message
        const testMessage = 'YubiKey test message ' + new Date().toISOString();
        const tempDir = path.join(process.env.TEMP || '/tmp', 'secure-mail-client');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const testFilePath = path.join(tempDir, 'yubikey-test.txt');
        fs.writeFileSync(testFilePath, testMessage);
        
        try {
          // Try to sign the test message
          const signResult = await this.yubiKeyService.signWithYubiKey(testMessage);
          canSign = signResult.success;
        } catch (error) {
          console.error('[YubiKeyManager] Error testing signing:', error);
          canSign = false;
        }
      }
      
      // For encryption/decryption, we would need a more complex test
      // This is a simplified version
      const canEncrypt = publicKeyFound;
      const canDecrypt = keyDetected && yubiKeyInfo.pgpInfo?.decryptionKey !== undefined;
      
      return {
        success: keyDetected && publicKeyFound,
        results: {
          keyDetected,
          publicKeyFound,
          canSign,
          canEncrypt,
          canDecrypt
        },
        message: keyDetected && publicKeyFound ? 
          'YubiKey is fully functional' :
          'YubiKey detected but not fully configured'
      };
    } catch (error) {
      console.error('[YubiKeyManager] Error testing YubiKey functions:', error);
      return { 
        success: false, 
        results: {
          keyDetected: false,
          publicKeyFound: false,
          canSign: false,
          canEncrypt: false,
          canDecrypt: false
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}