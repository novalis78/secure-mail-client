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

declare global {
  interface Window {
    electron: {
      ipcRenderer: IpcRenderer;
      imap: ImapAPI;
    };
  }
}