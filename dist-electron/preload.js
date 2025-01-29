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
    imap: {
        connect: (config) => electron_1.ipcRenderer.invoke('imap:connect', config),
        fetchEmails: () => electron_1.ipcRenderer.invoke('imap:fetch-emails'),
        disconnect: () => electron_1.ipcRenderer.invoke('imap:disconnect'),
        onConnected: (callback) => electron_1.ipcRenderer.on('imap:connected', (_) => callback()),
        onDisconnected: (callback) => electron_1.ipcRenderer.on('imap:disconnected', (_) => callback()),
        onError: (callback) => electron_1.ipcRenderer.on('imap:error', (_, error) => callback(error)),
        onEmailsFetched: (callback) => electron_1.ipcRenderer.on('imap:emails-fetched', (_, emails) => callback(emails)),
        // Add these new handlers
        onProgress: (callback) => electron_1.ipcRenderer.on('imap:progress', (_, progress) => callback(progress)),
        onStatus: (callback) => electron_1.ipcRenderer.on('imap:status', (_, status) => callback(status))
    }
});
//# sourceMappingURL=preload.js.map