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
    recipientFingerprints: string[] 
  }) => Promise<{ 
    success: boolean; 
    encryptedMessage?: string; 
    error?: string 
  }>;
  
  decryptMessage: (params: { 
    encryptedMessage: string; 
    passphrase: string 
  }) => Promise<{ 
    success: boolean; 
    decryptedMessage?: string; 
    error?: string 
  }>;
}

export interface YubikeyAPI {
  detect: () => Promise<{
    success: boolean;
    yubikey?: {
      detected: boolean;
      serial: string;
      version: string;
      pgpKeyId: string;
    };
    error?: string;
  }>;
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
    };
  }
}