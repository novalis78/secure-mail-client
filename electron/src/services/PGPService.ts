import * as openpgp from 'openpgp';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const Store = require('electron-store');
const store = new Store();

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  email: string;
  name?: string;
}

export class PGPService {
  private keysDirectory: string;

  constructor() {
    // Set up keys directory in the app data folder
    this.keysDirectory = path.join(app.getPath('userData'), 'pgp-keys');
    
    // Make sure the keys directory exists
    if (!fs.existsSync(this.keysDirectory)) {
      fs.mkdirSync(this.keysDirectory, { recursive: true });
    }
  }

  /**
   * Generate a new PGP key pair
   */
  async generateKeyPair(name: string, email: string, passphrase: string): Promise<KeyPair> {
    try {
      const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'ecc', 
        curve: 'curve25519',
        userIDs: [{ name, email }],
        passphrase
      });

      // Read the fingerprint from the public key
      const publicKeyObj = await openpgp.readKey({ armoredKey: publicKey });
      const fingerprint = publicKeyObj.getFingerprint();

      const keyPair: KeyPair = {
        publicKey,
        privateKey,
        fingerprint,
        email,
        name
      };

      // Save the key pair to the store
      this.saveKeyPair(keyPair);

      return keyPair;
    } catch (error) {
      console.error('Error generating PGP key pair:', error);
      throw error;
    }
  }

  /**
   * Import an existing PGP key pair
   */
  async importPublicKey(armoredKey: string): Promise<string> {
    try {
      // Validate the key is a valid PGP public key
      const publicKey = await openpgp.readKey({ armoredKey });
      
      // Extract user ID info
      const userID = publicKey.getUserIDs()[0];
      const email = userID.match(/<(.+)>/)?.[1] || 'unknown@email.com';
      const name = userID.match(/^([^<]+)/)?.[1].trim() || 'Unknown';
      
      // Get fingerprint
      const fingerprint = publicKey.getFingerprint();

      // Save the public key
      this.savePublicKey(fingerprint, email, armoredKey, name);

      return fingerprint;
    } catch (error) {
      console.error('Error importing PGP public key:', error);
      throw error;
    }
  }

  /**
   * Encrypt a message for a recipient
   */
  async encryptMessage(message: string, recipientFingerprints: string[]): Promise<string> {
    try {
      // Get public keys for all recipients
      const publicKeys = await Promise.all(recipientFingerprints.map(fp => 
        this.getPublicKeyByFingerprint(fp)
      ));
      
      // Parse the public keys
      const parsedPublicKeys = await Promise.all(publicKeys.map(key => 
        openpgp.readKey({ armoredKey: key })
      ));

      // Encrypt the message
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: message }),
        encryptionKeys: parsedPublicKeys
      });

      return encrypted as string;
    } catch (error) {
      console.error('Error encrypting message:', error);
      throw error;
    }
  }

  /**
   * Decrypt a message using our private key
   */
  async decryptMessage(encryptedMessage: string, passphrase: string): Promise<string> {
    try {
      // Get our private key
      const keyPair = this.getDefaultKeyPair();
      
      if (!keyPair) {
        throw new Error('No default key pair found');
      }

      // Parse the private key
      const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: keyPair.privateKey }),
        passphrase
      });

      // Parse the message
      const message = await openpgp.readMessage({
        armoredMessage: encryptedMessage
      });

      // Decrypt the message
      const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey
      });

      return decrypted as string;
    } catch (error) {
      console.error('Error decrypting message:', error);
      throw error;
    }
  }

  /**
   * Save a key pair to the store
   */
  private saveKeyPair(keyPair: KeyPair): void {
    // Save private key
    const privateKeyPath = path.join(this.keysDirectory, `${keyPair.fingerprint}.private`);
    fs.writeFileSync(privateKeyPath, keyPair.privateKey);

    // Save public key
    this.savePublicKey(keyPair.fingerprint, keyPair.email, keyPair.publicKey, keyPair.name);

    // Save key metadata
    const keyMetadata = store.get('pgp.keys', {});
    keyMetadata[keyPair.fingerprint] = {
      email: keyPair.email,
      name: keyPair.name,
      fingerprint: keyPair.fingerprint,
      isDefault: Object.keys(keyMetadata).length === 0, // First key is default
      hasPrivateKey: true
    };
    store.set('pgp.keys', keyMetadata);
  }

  /**
   * Save a public key to the store
   */
  private savePublicKey(fingerprint: string, email: string, publicKey: string, name?: string): void {
    // Save public key
    const publicKeyPath = path.join(this.keysDirectory, `${fingerprint}.public`);
    fs.writeFileSync(publicKeyPath, publicKey);

    // Save key metadata
    const keyMetadata = store.get('pgp.keys', {});
    const existing = keyMetadata[fingerprint] || {};
    
    keyMetadata[fingerprint] = {
      ...existing,
      email,
      name,
      fingerprint,
      hasPrivateKey: existing.hasPrivateKey || false
    };
    
    store.set('pgp.keys', keyMetadata);
  }

  /**
   * Get a public key by fingerprint
   */
  private getPublicKeyByFingerprint(fingerprint: string): string {
    const publicKeyPath = path.join(this.keysDirectory, `${fingerprint}.public`);
    
    if (!fs.existsSync(publicKeyPath)) {
      throw new Error(`Public key not found for fingerprint: ${fingerprint}`);
    }
    
    return fs.readFileSync(publicKeyPath, 'utf8');
  }

  /**
   * Get a private key by fingerprint
   */
  private getPrivateKeyByFingerprint(fingerprint: string): string | null {
    const privateKeyPath = path.join(this.keysDirectory, `${fingerprint}.private`);
    
    if (!fs.existsSync(privateKeyPath)) {
      return null;
    }
    
    return fs.readFileSync(privateKeyPath, 'utf8');
  }

  /**
   * Get the default key pair
   */
  private getDefaultKeyPair(): KeyPair | null {
    const keyMetadata = store.get('pgp.keys', {});
    const defaultKey = Object.values(keyMetadata).find((key: any) => key.isDefault && key.hasPrivateKey);
    
    if (!defaultKey) {
      return null;
    }
    
    const { fingerprint, email, name } = defaultKey;
    const publicKey = this.getPublicKeyByFingerprint(fingerprint);
    const privateKey = this.getPrivateKeyByFingerprint(fingerprint);
    
    if (!privateKey) {
      return null;
    }
    
    return {
      publicKey,
      privateKey,
      fingerprint,
      email,
      name
    };
  }

  /**
   * Get all public keys
   */
  getPublicKeys(): Array<{ fingerprint: string; email: string; name?: string }> {
    const keyMetadata = store.get('pgp.keys', {});
    return Object.values(keyMetadata);
  }

  /**
   * Set a key as the default key
   */
  setDefaultKey(fingerprint: string): void {
    const keyMetadata = store.get('pgp.keys', {});
    
    if (!keyMetadata[fingerprint]) {
      throw new Error(`Key not found for fingerprint: ${fingerprint}`);
    }
    
    // Set all keys to non-default
    Object.keys(keyMetadata).forEach(fp => {
      keyMetadata[fp].isDefault = false;
    });
    
    // Set the selected key to default
    keyMetadata[fingerprint].isDefault = true;
    
    store.set('pgp.keys', keyMetadata);
  }

  /**
   * Delete a key
   */
  deleteKey(fingerprint: string): void {
    const keyMetadata = store.get('pgp.keys', {});
    
    if (!keyMetadata[fingerprint]) {
      throw new Error(`Key not found for fingerprint: ${fingerprint}`);
    }
    
    // Delete public key file
    const publicKeyPath = path.join(this.keysDirectory, `${fingerprint}.public`);
    if (fs.existsSync(publicKeyPath)) {
      fs.unlinkSync(publicKeyPath);
    }
    
    // Delete private key file if it exists
    const privateKeyPath = path.join(this.keysDirectory, `${fingerprint}.private`);
    if (fs.existsSync(privateKeyPath)) {
      fs.unlinkSync(privateKeyPath);
    }
    
    // Remove from metadata
    delete keyMetadata[fingerprint];
    store.set('pgp.keys', keyMetadata);
    
    // If this was the default key, set a new default if any keys remain
    const remainingKeys = Object.keys(keyMetadata);
    if (remainingKeys.length > 0) {
      // Find a key with a private key to set as default
      const privateKeyOwner = Object.values(keyMetadata).find((key: any) => key.hasPrivateKey);
      if (privateKeyOwner) {
        this.setDefaultKey(privateKeyOwner.fingerprint);
      }
    }
  }
}