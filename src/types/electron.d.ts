export interface IpcRenderer {
  send: (channel: string, data: any) => void;
  on: (channel: string, func: Function) => void;
}

export interface ImapAPI {
  connect: (config: {
    user: string;
    password: string;
    host?: string;
    port?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  fetchEmails: () => Promise<{ success: boolean; emails?: any[]; error?: string }>;
  disconnect: () => Promise<{ success: boolean; error?: string }>;
  onConnected: (callback: () => void) => void;
  onDisconnected: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  onEmailsFetched: (callback: (emails: any[]) => void) => void;
  onProgress: (callback: (progress: { current: number; total: number }) => void) => void;
  onStatus: (callback: (status: string) => void) => void;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
  email: string;
  name?: string;
}

export interface PGPAPI {
  generateKey: (params: { 
    name: string; 
    email: string; 
    passphrase: string 
  }) => Promise<{ 
    success: boolean; 
    keyPair?: KeyPair; 
    error?: string 
  }>;
  
  importPublicKey: (params: { 
    armoredKey: string 
  }) => Promise<{ 
    success: boolean; 
    fingerprint?: string; 
    error?: string 
  }>;
  
  getPublicKeys: () => Promise<{ 
    success: boolean; 
    keys?: Array<{ 
      fingerprint: string; 
      email: string; 
      name?: string;
      isDefault?: boolean;
      hasPrivateKey?: boolean; 
    }>;
    error?: string 
  }>;
  
  setDefaultKey: (params: { 
    fingerprint: string 
  }) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  
  deleteKey: (params: { 
    fingerprint: string 
  }) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  
  encryptMessage: (params: { 
    message: string; 
    recipientFingerprints: string[];
    options?: {
      sign?: boolean;
      attachPublicKey?: boolean;
      passphrase?: string;
    }
  }) => Promise<{ 
    success: boolean; 
    encryptedMessage?: string; 
    error?: string;
    yubiKeyDetected?: boolean;
  }>;
  
  decryptMessage: (params: { 
    encryptedMessage: string; 
    passphrase: string 
  }) => Promise<{ 
    success: boolean; 
    decryptedMessage?: string; 
    error?: string 
  }>;
  
  signMessage: (params: {
    message: string;
    passphrase: string;
  }) => Promise<{
    success: boolean;
    signedMessage?: string;
    originalMessage?: string;
    error?: string;
    needsPin?: boolean;
    status?: 'ready' | 'signing' | 'complete' | 'failed';
    yubiKeyDetected?: boolean;
  }>;
  
  addContact: (params: {
    email: string;
    name?: string;
    publicKey?: string;
  }) => Promise<{
    success: boolean;
    fingerprint?: string;
    error?: string;
  }>;
  
  extractKeyFromMessage: (params: {
    message: string;
  }) => Promise<{
    success: boolean;
    found: boolean;
    publicKey?: string;
    fingerprint?: string;
    email?: string;
    name?: string;
    error?: string;
  }>;
}

export interface YubikeyAPI {
  detect: () => Promise<{
    success: boolean;
    yubikey?: {
      detected: boolean;
      serial?: string;
      version?: string;
      formFactor?: string;
      interfaces?: string[];
      applications?: Record<string, string>;
      pgpInfo?: {
        versionPGP?: string;
        versionApp?: string;
        pinTriesRemaining?: number;
        signatureKey?: {
          fingerprint?: string;
          touchPolicy?: string;
        };
        decryptionKey?: {
          fingerprint?: string;
          touchPolicy?: string;
        };
        authenticationKey?: {
          fingerprint?: string;
          touchPolicy?: string;
        };
      };
    };
    error?: string;
  }>;

  hasPGPKeys: () => Promise<{
    success: boolean;
    hasPGPKeys?: boolean;
    error?: string;
  }>;

  getPGPFingerprints: () => Promise<{
    success: boolean;
    fingerprints?: {
      signature?: string;
      decryption?: string;
      authentication?: string;
    };
    error?: string;
  }>;
  
  exportPublicKeys: () => Promise<{
    success: boolean;
    keys?: {
      signature?: string;
      decryption?: string;
      authentication?: string;
    };
    error?: string;
    yubiKeyDetected: boolean;
  }>;
  
  importToPGP: () => Promise<{
    success: boolean;
    importResults?: Array<{
      type: string;
      fingerprint?: string;
      success: boolean;
      error?: string;
    }>;
    defaultKeySet?: boolean;
    error?: string;
  }>;
}

export interface OAuthAPI {
  authenticate: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  checkAuth: () => Promise<{
    success: boolean;
    isAuthenticated: boolean;
    error?: string;
  }>;
  
  logout: () => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  fetchEmails: () => Promise<{
    success: boolean;
    emails?: any[];
    error?: string;
  }>;
  
  sendEmail: (params: {
    to: string;
    subject: string;
    body: string;
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  
  submitAuthCode: (code: string) => void;
  cancelAuthCode: () => void;
}

export interface Credentials {
  email?: string;
  password?: string;
  host?: string;
  port?: number;
  encryption?: 'ssl' | 'tls' | 'none';
  encryptionMethod?: 'pgp' | 'yubikey' | 'none';
}

export interface CredentialsAPI {
  saveGmail: (params: { 
    email: string; 
    password: string 
  }) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  
  getGmail: () => Promise<{ 
    success: boolean; 
    credentials?: Credentials; 
    error?: string 
  }>;
  
  saveImap: (credentials: Credentials) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  
  getImap: () => Promise<{ 
    success: boolean; 
    credentials?: Credentials; 
    error?: string 
  }>;
  
  clear: () => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: IpcRenderer;
      imap: ImapAPI;
      pgp: PGPAPI;
      yubikey: YubikeyAPI;
      credentials: CredentialsAPI;
      oauth: OAuthAPI;
    };
  }
}