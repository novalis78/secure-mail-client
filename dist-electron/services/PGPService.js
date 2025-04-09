"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PGPService = void 0;
const openpgp = __importStar(require("openpgp"));
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Use file-based storage instead of electron-store
const getConfigPath = () => path.join(electron_1.app.getPath('userData'), 'pgp-config.json');
// Simple file-based config functions
const readConfig = () => {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
        try {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        catch (error) {
            console.error('Error reading PGP config:', error);
            return {};
        }
    }
    return {};
};
const writeConfig = (config) => {
    const configPath = getConfigPath();
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }
    catch (error) {
        console.error('Error writing PGP config:', error);
    }
};
class PGPService {
    keysDirectory;
    constructor() {
        // Set up keys directory in the app data folder
        this.keysDirectory = path.join(electron_1.app.getPath('userData'), 'pgp-keys');
        console.log('[PGPService] Keys directory path:', this.keysDirectory);
        // Make sure the keys directory exists
        if (!fs.existsSync(this.keysDirectory)) {
            console.log('[PGPService] Creating keys directory');
            fs.mkdirSync(this.keysDirectory, { recursive: true });
        }
        // Load metadata from pgp-config.json
        const config = readConfig();
        console.log('[PGPService] Loaded configuration:', Object.keys(config).join(', '));
        // Log information about existing keys
        const keyMetadata = (config.pgpKeys || {});
        console.log('[PGPService] Found', Object.keys(keyMetadata).length, 'keys in metadata');
        // Debug output config file location
        const configPath = getConfigPath();
        console.log('[PGPService] Configuration file path:', configPath);
        // Count actual key files
        try {
            const keyFiles = fs.readdirSync(this.keysDirectory);
            console.log('[PGPService] Key files in directory:', keyFiles.length, 'files');
            console.log('[PGPService] Key files:', keyFiles.join(', '));
        }
        catch (err) {
            console.error('[PGPService] Error reading key directory:', err);
        }
    }
    /**
     * Generate a new PGP key pair
     */
    async generateKeyPair(name, email, passphrase) {
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
            const keyPair = {
                publicKey,
                privateKey,
                fingerprint,
                email,
                name
            };
            // Save the key pair to the store
            this.saveKeyPair(keyPair);
            return keyPair;
        }
        catch (error) {
            console.error('Error generating PGP key pair:', error);
            throw error;
        }
    }
    /**
     * Import an existing PGP key pair
     */
    async importPublicKey(armoredKey) {
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
        }
        catch (error) {
            console.error('Error importing PGP public key:', error);
            throw error;
        }
    }
    /**
     * Encrypt a message for a recipient
     * @param message The message to encrypt
     * @param recipientFingerprints Array of recipient public key fingerprints
     * @param options Optional parameters: sign, attachPublicKey
     */
    async encryptMessage(message, recipientFingerprints, options = {}) {
        try {
            const { sign = true, attachPublicKey = true, passphrase = '' } = options;
            // Get public keys for all recipients
            const publicKeys = await Promise.all(recipientFingerprints.map(fp => this.getPublicKeyByFingerprint(fp)));
            // Parse the public keys
            const parsedPublicKeys = await Promise.all(publicKeys.map(key => openpgp.readKey({ armoredKey: key })));
            // Set up encryption options
            const encryptOptions = {
                message: await openpgp.createMessage({ text: message }),
                encryptionKeys: parsedPublicKeys
            };
            // Add signing if enabled and we have a default key
            if (sign) {
                const keyPair = this.getDefaultKeyPair();
                if (keyPair) {
                    try {
                        // Decrypt the private key for signing
                        const privateKey = await openpgp.decryptKey({
                            privateKey: await openpgp.readPrivateKey({ armoredKey: keyPair.privateKey }),
                            passphrase
                        });
                        // Add signing key to encryption options
                        encryptOptions.signingKeys = privateKey;
                        console.log('Message will be signed with key:', keyPair.fingerprint);
                    }
                    catch (signingError) {
                        console.warn('Failed to decrypt private key for signing:', signingError);
                        // Continue without signing if passphrase is wrong
                    }
                }
            }
            // Encrypt the message
            const encrypted = await openpgp.encrypt(encryptOptions);
            // If we should attach our public key, append it
            if (attachPublicKey) {
                const keyPair = this.getDefaultKeyPair();
                if (keyPair) {
                    return encrypted + '\n\n---\nThis message was sent with Secure Mail Client. My public key is attached below:\n\n' + keyPair.publicKey;
                }
            }
            return encrypted;
        }
        catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    }
    /**
     * Sign a message without encrypting it
     * If a YubiKey is connected and default key is from YubiKey,
     * we'll use a YubiKey-specific approach
     */
    async signMessage(message, passphrase) {
        try {
            // Update status for UI notifications
            const result = {
                success: false,
                originalMessage: message,
                status: 'signing'
            };
            // Get information about our default key
            const config = readConfig();
            const keyMetadata = (config.pgpKeys || {});
            // Find the default key from metadata
            const defaultKeyMeta = Object.values(keyMetadata)
                .find(key => key && key.isDefault);
            if (!defaultKeyMeta) {
                console.warn('No default key found for signing, returning original message');
                return {
                    success: false,
                    originalMessage: message,
                    error: 'No default key found for signing',
                    status: 'failed'
                };
            }
            console.log('[PGPService] Using default key with fingerprint:', defaultKeyMeta.fingerprint);
            // If this is a YubiKey-sourced key without a private key file
            // We'll use the YubiKeyService to sign the message
            if (!defaultKeyMeta.hasPrivateKey || defaultKeyMeta.fromYubiKey) {
                console.log('[PGPService] Key is from YubiKey, using YubiKey signing');
                try {
                    // Get YubiKey service
                    const { YubiKeyService } = require('./YubiKeyService');
                    const yubiKeyService = new YubiKeyService();
                    // Sign the message with the YubiKey service
                    // If passphrase is provided, we'll use it as PIN for the YubiKey
                    const signResult = await yubiKeyService.signWithYubiKey(message, passphrase);
                    // If PIN is needed, return that info to the UI
                    if (!signResult.success && signResult.needsPin) {
                        return {
                            success: false,
                            originalMessage: message,
                            error: signResult.error,
                            needsPin: true,
                            status: 'ready', // Ready for PIN entry
                            yubiKeyDetected: signResult.yubiKeyDetected
                        };
                    }
                    // If signing failed for other reasons
                    if (!signResult.success) {
                        console.error('[PGPService] YubiKey signing failed:', signResult.error);
                        // Pass through YubiKey detection status
                        const yubiKeyDetected = typeof signResult.yubiKeyDetected !== 'undefined' ?
                            signResult.yubiKeyDetected : true;
                        // Get the public key to include in the message
                        const publicKeyPath = path.join(this.keysDirectory, `${defaultKeyMeta.fingerprint}.public`);
                        const publicKeyArmored = fs.existsSync(publicKeyPath) ?
                            fs.readFileSync(publicKeyPath, 'utf8') : 'Public key file not found';
                        // Create a fallback message with the error
                        const fallbackMessage = `${message}

-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

This message was attempted to be signed with YubiKey by ${defaultKeyMeta.name} <${defaultKeyMeta.email}>
Error during signing: ${signResult.error || 'Unknown error'}
Fingerprint: ${defaultKeyMeta.fingerprint}

-----BEGIN PGP SIGNATURE-----
[YubiKey Signature Unavailable]
-----END PGP SIGNATURE-----

-----BEGIN PGP PUBLIC KEY BLOCK-----
${publicKeyArmored.split('-----BEGIN PGP PUBLIC KEY BLOCK-----')[1] || 'Public key unavailable'}`;
                        return {
                            success: true, // We still consider this a success to allow sending the email
                            signedMessage: fallbackMessage,
                            status: 'complete',
                            yubiKeyDetected: yubiKeyDetected
                        };
                    }
                    // Signing succeeded
                    return {
                        success: true,
                        signedMessage: signResult.signedData,
                        status: 'complete',
                        yubiKeyDetected: signResult.yubiKeyDetected
                    };
                }
                catch (yubiKeyError) {
                    console.error('[PGPService] Error during YubiKey signing:', yubiKeyError);
                    // Check if error indicates PIN needed
                    const errorMsg = yubiKeyError instanceof Error ? yubiKeyError.message : String(yubiKeyError);
                    // Check if this was a YubiKey detection error
                    const yubiKeyDetected = !(errorMsg.includes('YubiKey not detected') ||
                        errorMsg.includes('YubiKey has been disconnected'));
                    if (errorMsg.includes('PIN') || errorMsg.includes('pin')) {
                        return {
                            success: false,
                            originalMessage: message,
                            error: 'PIN required for signing',
                            needsPin: true,
                            status: 'ready',
                            yubiKeyDetected
                        };
                    }
                    // Get the public key to include in the message
                    const publicKeyPath = path.join(this.keysDirectory, `${defaultKeyMeta.fingerprint}.public`);
                    const publicKeyArmored = fs.existsSync(publicKeyPath) ?
                        fs.readFileSync(publicKeyPath, 'utf8') : 'Public key file not found';
                    // Create a fallback message
                    const fallbackMessage = `${message}

-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA256

This message was attempted to be signed with YubiKey by ${defaultKeyMeta.name} <${defaultKeyMeta.email}>
Error during signing: ${yubiKeyError.message || 'Unknown error'}
Fingerprint: ${defaultKeyMeta.fingerprint}

-----BEGIN PGP SIGNATURE-----
[YubiKey Signature Unavailable]
-----END PGP SIGNATURE-----

-----BEGIN PGP PUBLIC KEY BLOCK-----
${publicKeyArmored.split('-----BEGIN PGP PUBLIC KEY BLOCK-----')[1] || 'Public key unavailable'}`;
                    return {
                        success: true, // We still consider this a success to allow sending the email
                        signedMessage: fallbackMessage,
                        status: 'complete',
                        yubiKeyDetected
                    };
                }
            }
            // Normal private key-based signing if we have a private key file
            const keyPair = this.getDefaultKeyPair();
            if (!keyPair) {
                console.warn('No private key file found for signing, returning original message');
                return {
                    success: false,
                    originalMessage: message,
                    error: 'No private key file found for signing'
                };
            }
            try {
                // Parse the private key
                const privateKey = await openpgp.decryptKey({
                    privateKey: await openpgp.readPrivateKey({ armoredKey: keyPair.privateKey }),
                    passphrase
                });
                // Create a clear-signed message
                const signed = await openpgp.sign({
                    message: await openpgp.createMessage({ text: message }),
                    signingKeys: privateKey,
                    detached: false
                });
                return {
                    success: true,
                    signedMessage: signed
                };
            }
            catch (decryptError) {
                console.warn('Error decrypting private key for signing:', decryptError);
                return {
                    success: false,
                    originalMessage: message,
                    error: 'Incorrect passphrase or key issue'
                };
            }
        }
        catch (error) {
            console.error('Error signing message:', error);
            return {
                success: false,
                originalMessage: message,
                error: error instanceof Error ? error.message : 'Unknown error during signing'
            };
        }
    }
    /**
     * Decrypt a message using our private key
     */
    async decryptMessage(encryptedMessage, passphrase) {
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
            return decrypted;
        }
        catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }
    /**
     * Save a key pair to the store
     */
    saveKeyPair(keyPair) {
        // Save private key
        const privateKeyPath = path.join(this.keysDirectory, `${keyPair.fingerprint}.private`);
        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        // Save public key
        this.savePublicKey(keyPair.fingerprint, keyPair.email, keyPair.publicKey, keyPair.name);
        // Save key metadata
        const config = readConfig();
        const keyMetadata = config.pgpKeys || {};
        keyMetadata[keyPair.fingerprint] = {
            email: keyPair.email,
            name: keyPair.name,
            fingerprint: keyPair.fingerprint,
            isDefault: Object.keys(keyMetadata).length === 0, // First key is default
            hasPrivateKey: true
        };
        writeConfig({ ...config, pgpKeys: keyMetadata });
    }
    /**
     * Save a public key to the store
     */
    savePublicKey(fingerprint, email, publicKey, name) {
        // Save public key
        const publicKeyPath = path.join(this.keysDirectory, `${fingerprint}.public`);
        fs.writeFileSync(publicKeyPath, publicKey);
        // Save key metadata
        const config = readConfig();
        const keyMetadata = config.pgpKeys || {};
        const existing = keyMetadata[fingerprint] || {};
        keyMetadata[fingerprint] = {
            ...existing,
            email,
            name,
            fingerprint,
            hasPrivateKey: existing.hasPrivateKey || false
        };
        writeConfig({ ...config, pgpKeys: keyMetadata });
    }
    /**
     * Get a public key by fingerprint
     */
    getPublicKeyByFingerprint(fingerprint) {
        const publicKeyPath = path.join(this.keysDirectory, `${fingerprint}.public`);
        if (!fs.existsSync(publicKeyPath)) {
            throw new Error(`Public key not found for fingerprint: ${fingerprint}`);
        }
        return fs.readFileSync(publicKeyPath, 'utf8');
    }
    /**
     * Get a private key by fingerprint
     */
    getPrivateKeyByFingerprint(fingerprint) {
        const privateKeyPath = path.join(this.keysDirectory, `${fingerprint}.private`);
        if (!fs.existsSync(privateKeyPath)) {
            return null;
        }
        return fs.readFileSync(privateKeyPath, 'utf8');
    }
    /**
     * Get the default key pair
     */
    getDefaultKeyPair() {
        // Enhanced logging to debug the issue
        console.log('[PGPService] Looking for default key pair');
        const config = readConfig();
        console.log('[PGPService] Config loaded:', Object.keys(config));
        const keyMetadata = (config.pgpKeys || {});
        console.log('[PGPService] Number of PGP keys found:', Object.keys(keyMetadata).length);
        if (Object.keys(keyMetadata).length > 0) {
            console.log('[PGPService] Key fingerprints:', Object.keys(keyMetadata));
            console.log('[PGPService] PGP keys metadata:', JSON.stringify(keyMetadata, null, 2));
        }
        const defaultKey = Object.values(keyMetadata)
            .find(key => key && key.isDefault && key.hasPrivateKey);
        if (!defaultKey) {
            // Log the reason why no default key was found
            if (Object.values(keyMetadata).length === 0) {
                console.log('[PGPService] No PGP keys found in the store');
            }
            else {
                const hasDefaultKey = Object.values(keyMetadata).some(k => k.isDefault);
                const hasPrivateKey = Object.values(keyMetadata).some(k => k.hasPrivateKey);
                console.log('[PGPService] Keys exist but no default key found');
                console.log('[PGPService] Any default key?', hasDefaultKey);
                console.log('[PGPService] Any private key?', hasPrivateKey);
                // If keys exist but none is default, we should provide guidance
                if (!hasDefaultKey && hasPrivateKey) {
                    console.log('[PGPService] Fix: Need to set a default key with setDefaultKey()');
                }
                else if (hasDefaultKey && !hasPrivateKey) {
                    console.log('[PGPService] Fix: Default key exists but no private key file was found');
                }
            }
            return null;
        }
        console.log('[PGPService] Found default key:', defaultKey.fingerprint);
        const { fingerprint, email, name } = defaultKey;
        // Check if public key file exists
        try {
            const publicKey = this.getPublicKeyByFingerprint(fingerprint);
            console.log('[PGPService] Public key file found');
            try {
                const privateKey = this.getPrivateKeyByFingerprint(fingerprint);
                if (!privateKey) {
                    console.log('[PGPService] Private key file missing for default key');
                    return null;
                }
                console.log('[PGPService] Successfully loaded default key pair');
                return {
                    publicKey,
                    privateKey,
                    fingerprint,
                    email,
                    name
                };
            }
            catch (privateKeyError) {
                console.error('[PGPService] Error loading private key:', privateKeyError);
                return null;
            }
        }
        catch (publicKeyError) {
            console.error('[PGPService] Error loading public key:', publicKeyError);
            return null;
        }
    }
    /**
     * Get all public keys
     */
    getPublicKeys() {
        const config = readConfig();
        const keyMetadata = (config.pgpKeys || {});
        return Object.values(keyMetadata);
    }
    /**
     * Set a key as the default key
     */
    setDefaultKey(fingerprint) {
        const config = readConfig();
        const keyMetadata = config.pgpKeys || {};
        if (!keyMetadata[fingerprint]) {
            throw new Error(`Key not found for fingerprint: ${fingerprint}`);
        }
        // Set all keys to non-default
        Object.keys(keyMetadata).forEach(fp => {
            keyMetadata[fp].isDefault = false;
        });
        // Set the selected key to default
        keyMetadata[fingerprint].isDefault = true;
        writeConfig({ ...config, pgpKeys: keyMetadata });
    }
    /**
     * Mark a key as coming from YubiKey
     */
    markKeyAsYubiKey(fingerprint) {
        const config = readConfig();
        const keyMetadata = config.pgpKeys || {};
        if (!keyMetadata[fingerprint]) {
            throw new Error(`Key not found for fingerprint: ${fingerprint}`);
        }
        // Mark the key as a YubiKey key
        keyMetadata[fingerprint].fromYubiKey = true;
        writeConfig({ ...config, pgpKeys: keyMetadata });
    }
    /**
     * Delete a key
     */
    deleteKey(fingerprint) {
        const config = readConfig();
        const keyMetadata = config.pgpKeys || {};
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
        writeConfig({ ...config, pgpKeys: keyMetadata });
        // If this was the default key, set a new default if any keys remain
        const remainingKeys = Object.keys(keyMetadata);
        if (remainingKeys.length > 0) {
            // Find a key with a private key to set as default
            const privateKeyOwner = Object.values(keyMetadata)
                .find(key => typeof key === 'object' && key && key.hasPrivateKey);
            if (privateKeyOwner && typeof privateKeyOwner === 'object' && privateKeyOwner.fingerprint) {
                this.setDefaultKey(privateKeyOwner.fingerprint);
            }
        }
    }
    /**
     * Add an email address to contacts
     * If no publicKey is provided, it just creates a contact record without a key
     */
    async addContact(email, name, publicKey) {
        try {
            // Sanitize input
            const sanitizedEmail = email.trim().toLowerCase();
            const sanitizedName = name?.trim() || sanitizedEmail.split('@')[0];
            // If we have a public key, import it
            if (publicKey) {
                try {
                    // Need to await since importPublicKey is async
                    const fingerprint = await this.importPublicKey(publicKey);
                    return { success: true, fingerprint };
                }
                catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'Error importing key'
                    };
                }
            }
            else {
                // Otherwise, just save the contact to contacts list
                // Get the contacts configuration
                const config = readConfig();
                const contacts = config.contacts || {};
                // Add the contact
                contacts[sanitizedEmail] = {
                    email: sanitizedEmail,
                    name: sanitizedName,
                    hasPublicKey: false,
                    created: new Date().toISOString()
                };
                // Save the updated contacts
                writeConfig({ ...config, contacts });
                return { success: true };
            }
        }
        catch (error) {
            console.error('Error adding contact:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error adding contact'
            };
        }
    }
    /**
     * Extract public key from a message if it exists
     * This helps with automatic key discovery from signed or key-attached messages
     */
    async extractPublicKeyFromMessage(message) {
        try {
            // Look for PGP PUBLIC KEY BLOCK in message
            const keyPattern = /-----BEGIN PGP PUBLIC KEY BLOCK-----([\s\S]*?)-----END PGP PUBLIC KEY BLOCK-----/;
            const match = message.match(keyPattern);
            if (!match) {
                return { found: false };
            }
            // Extract the key
            const publicKey = match[0];
            // Parse the key to get fingerprint and user info
            const parsedKey = await openpgp.readKey({ armoredKey: publicKey });
            const fingerprint = parsedKey.getFingerprint();
            // Extract email and name from user ID
            const userID = parsedKey.getUserIDs()[0] || '';
            const emailMatch = userID.match(/<(.+)>/);
            const nameMatch = userID.match(/^([^<]+)/);
            const email = emailMatch ? emailMatch[1] : '';
            const name = nameMatch ? nameMatch[1].trim() : '';
            return {
                found: true,
                publicKey,
                fingerprint,
                email,
                name
            };
        }
        catch (error) {
            console.error('Error extracting public key from message:', error);
            return { found: false };
        }
    }
}
exports.PGPService = PGPService;
//# sourceMappingURL=PGPService.js.map