"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/src/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, data) => {
            electron_1.ipcRenderer.send(channel, data);
        },
        on: (channel, func) => {
            electron_1.ipcRenderer.on(channel, (_, ...args) => func(...args));
        }
    },
    app: {
        close: () => electron_1.ipcRenderer.invoke('app:close')
    },
    imap: {
        connect: (config) => electron_1.ipcRenderer.invoke('imap:connect', config),
        fetchEmails: () => electron_1.ipcRenderer.invoke('imap:fetch-emails'),
        disconnect: () => electron_1.ipcRenderer.invoke('imap:disconnect'),
        onConnected: (callback) => electron_1.ipcRenderer.on('imap:connected', (_) => callback()),
        onDisconnected: (callback) => electron_1.ipcRenderer.on('imap:disconnected', (_) => callback()),
        onError: (callback) => electron_1.ipcRenderer.on('imap:error', (_, error) => callback(error)),
        onEmailsFetched: (callback) => electron_1.ipcRenderer.on('imap:emails-fetched', (_, emails) => {
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
        onProgress: (callback) => electron_1.ipcRenderer.on('imap:progress', (_, progress) => callback(progress)),
        onStatus: (callback) => electron_1.ipcRenderer.on('imap:status', (_, status) => callback(status))
    },
    oauth: {
        // OAuth authentication methods
        authenticate: () => electron_1.ipcRenderer.invoke('oauth:authenticate'),
        checkAuth: () => electron_1.ipcRenderer.invoke('oauth:check-auth'),
        logout: () => electron_1.ipcRenderer.invoke('oauth:logout'),
        fetchEmails: () => electron_1.ipcRenderer.invoke('oauth:fetch-emails'),
        sendEmail: (params) => electron_1.ipcRenderer.invoke('oauth:send-email', params),
        // Code prompt response handlers
        submitAuthCode: (code) => electron_1.ipcRenderer.send('oauth:code-response', code),
        cancelAuthCode: () => electron_1.ipcRenderer.send('oauth:code-cancelled')
    },
    pgp: {
        generateKey: (params) => electron_1.ipcRenderer.invoke('pgp:generate-key', params),
        importPublicKey: (params) => electron_1.ipcRenderer.invoke('pgp:import-public-key', params),
        getPublicKeys: () => electron_1.ipcRenderer.invoke('pgp:get-public-keys'),
        setDefaultKey: (params) => electron_1.ipcRenderer.invoke('pgp:set-default-key', params),
        deleteKey: (params) => electron_1.ipcRenderer.invoke('pgp:delete-key', params),
        encryptMessage: (params) => electron_1.ipcRenderer.invoke('pgp:encrypt-message', params),
        decryptMessage: (params) => electron_1.ipcRenderer.invoke('pgp:decrypt-message', params),
        signMessage: (params) => electron_1.ipcRenderer.invoke('pgp:sign-message', params),
        addContact: (params) => electron_1.ipcRenderer.invoke('pgp:add-contact', params),
        extractKeyFromMessage: (params) => electron_1.ipcRenderer.invoke('pgp:extract-key-from-message', params)
    },
    yubikey: {
        detect: () => electron_1.ipcRenderer.invoke('yubikey:detect'),
        hasPGPKeys: () => electron_1.ipcRenderer.invoke('yubikey:has-pgp-keys'),
        getPGPFingerprints: () => electron_1.ipcRenderer.invoke('yubikey:get-pgp-fingerprints'),
        exportPublicKeys: () => electron_1.ipcRenderer.invoke('yubikey:export-public-keys'),
        importToPGP: () => electron_1.ipcRenderer.invoke('yubikey:import-to-pgp'),
        importToGPG: () => electron_1.ipcRenderer.invoke('yubikey:import-to-gpg'),
        // YubiKey Manager functions
        checkPublicKey: (fingerprint) => electron_1.ipcRenderer.invoke('yubikey:check-public-key', fingerprint),
        importPublicKeyFromKeyserver: (fingerprint) => electron_1.ipcRenderer.invoke('yubikey:import-from-keyserver', fingerprint),
        importPublicKeyFromFile: () => electron_1.ipcRenderer.invoke('yubikey:import-from-file'),
        exportPublicKeyToFile: (fingerprint) => electron_1.ipcRenderer.invoke('yubikey:export-to-file', fingerprint),
        uploadPublicKeyToKeyserver: (fingerprint) => electron_1.ipcRenderer.invoke('yubikey:upload-to-keyserver', fingerprint),
        // New YubiKey URL functions
        hasPublicKeyURL: () => electron_1.ipcRenderer.invoke('yubikey:has-public-key-url'),
        getPublicKeyURL: () => electron_1.ipcRenderer.invoke('yubikey:get-public-key-url'),
        importPublicKeyFromCardURL: () => electron_1.ipcRenderer.invoke('yubikey:import-from-card-url'),
        testYubiKeyFunctions: () => electron_1.ipcRenderer.invoke('yubikey:test-functions')
    },
    credentials: {
        saveGmail: (params) => electron_1.ipcRenderer.invoke('credentials:save-gmail', params),
        getGmail: () => electron_1.ipcRenderer.invoke('credentials:get-gmail'),
        saveImap: (credentials) => electron_1.ipcRenderer.invoke('credentials:save-imap', credentials),
        getImap: () => electron_1.ipcRenderer.invoke('credentials:get-imap'),
        clear: () => electron_1.ipcRenderer.invoke('credentials:clear')
    },
    premium: {
        getStatus: () => electron_1.ipcRenderer.invoke('premium:get-status'),
        getBitcoinAddress: (params) => electron_1.ipcRenderer.invoke('premium:get-bitcoin-address', params),
        checkPayment: (params) => electron_1.ipcRenderer.invoke('premium:check-payment', params),
        // XPUB key management
        setXpub: (params) => electron_1.ipcRenderer.invoke('premium:set-xpub', params),
        getXpub: () => electron_1.ipcRenderer.invoke('premium:get-xpub'),
        // Development only - would be removed in production
        setStatus: (params) => electron_1.ipcRenderer.invoke('premium:set-status', params)
    }
});
//# sourceMappingURL=preload.js.map