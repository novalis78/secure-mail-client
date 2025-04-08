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
      ipcRenderer.on('imap:emails-fetched', (_, emails: any[]) => {
        // Debug log to check emails content when crossing IPC boundary
        console.log("PRELOAD: Emails crossing IPC boundary:", emails.length);
        if (emails.length > 0) {
          const sample = emails[0];
          console.log("PRELOAD: First email sample:", {
            id: sample.id,
            subject: sample.subject,
            hasText: typeof sample.text === 'string',
            textLength: sample.text ? String(sample.text).length : 0,
            hasHtml: typeof sample.html === 'string',
            htmlLength: sample.html ? String(sample.html).length : 0,
            textSample: sample.text ? sample.text.substring(0, 100) : null
          });
        }
        callback(emails);
      }),
    // Add these new handlers
    onProgress: (callback: (progress: { current: number; total: number }) => void) =>
      ipcRenderer.on('imap:progress', (_, progress) => callback(progress)),
    onStatus: (callback: (status: string) => void) =>
      ipcRenderer.on('imap:status', (_, status) => callback(status))
  },
  oauth: {
    // OAuth authentication methods
    authenticate: () => ipcRenderer.invoke('oauth:authenticate'),
    checkAuth: () => ipcRenderer.invoke('oauth:check-auth'),
    logout: () => ipcRenderer.invoke('oauth:logout'),
    fetchEmails: () => ipcRenderer.invoke('oauth:fetch-emails'),
    sendEmail: (params: { to: string; subject: string; body: string }) => 
      ipcRenderer.invoke('oauth:send-email', params),
    // Code prompt response handlers
    submitAuthCode: (code: string) => ipcRenderer.send('oauth:code-response', code),
    cancelAuthCode: () => ipcRenderer.send('oauth:code-cancelled')
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