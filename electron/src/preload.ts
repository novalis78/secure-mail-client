// electron/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel: string, func: Function) => {
      ipcRenderer.on(channel, (_, ...args) => func(...args));
    }
  },
  imap: {
    connect: (config: any) => ipcRenderer.invoke('imap:connect', config),
    fetchEmails: () => ipcRenderer.invoke('imap:fetch-emails'),
    disconnect: () => ipcRenderer.invoke('imap:disconnect'),
    onConnected: (callback: () => void) => 
      ipcRenderer.on('imap:connected', (_) => callback()),
    onDisconnected: (callback: () => void) => 
      ipcRenderer.on('imap:disconnected', (_) => callback()),
    onError: (callback: (error: string) => void) => 
      ipcRenderer.on('imap:error', (_, error: string) => callback(error)),
    onEmailsFetched: (callback: (emails: any[]) => void) => 
      ipcRenderer.on('imap:emails-fetched', (_, emails: any[]) => callback(emails)),
    // Add these new handlers
    onProgress: (callback: (progress: { current: number; total: number }) => void) =>
      ipcRenderer.on('imap:progress', (_, progress) => callback(progress)),
    onStatus: (callback: (status: string) => void) =>
      ipcRenderer.on('imap:status', (_, status) => callback(status))
  },
  pgp: {
    generateKey: (params: { name: string; email: string; passphrase: string }) => 
      ipcRenderer.invoke('pgp:generate-key', params),
    importPublicKey: (params: { armoredKey: string }) => 
      ipcRenderer.invoke('pgp:import-public-key', params),
    getPublicKeys: () => 
      ipcRenderer.invoke('pgp:get-public-keys'),
    setDefaultKey: (params: { fingerprint: string }) => 
      ipcRenderer.invoke('pgp:set-default-key', params),
    deleteKey: (params: { fingerprint: string }) => 
      ipcRenderer.invoke('pgp:delete-key', params),
    encryptMessage: (params: { message: string; recipientFingerprints: string[] }) => 
      ipcRenderer.invoke('pgp:encrypt-message', params),
    decryptMessage: (params: { encryptedMessage: string; passphrase: string }) => 
      ipcRenderer.invoke('pgp:decrypt-message', params)
  },
  yubikey: {
    detect: () => ipcRenderer.invoke('yubikey:detect')
  },
  credentials: {
    saveGmail: (params: { email: string; password: string }) => 
      ipcRenderer.invoke('credentials:save-gmail', params),
    getGmail: () => 
      ipcRenderer.invoke('credentials:get-gmail'),
    saveImap: (credentials: any) => 
      ipcRenderer.invoke('credentials:save-imap', credentials),
    getImap: () => 
      ipcRenderer.invoke('credentials:get-imap'),
    clear: () => 
      ipcRenderer.invoke('credentials:clear')
  }
});