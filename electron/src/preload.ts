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
      ipcRenderer.on('imap:emails-fetched', (_, emails: any[]) => callback(emails))
  }
});