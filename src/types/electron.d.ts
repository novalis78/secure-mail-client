export interface ElectronWindow extends Window {
    electron?: {
      ipcRenderer: {
        send(channel: string, data: any): void;
        on(channel: string, func: Function): void;
      };
      imap?: {
        connect(config: {
          user: string;
          password: string;
          host?: string;
          port?: number;
        }): Promise<void>;
        fetchEmails(): Promise<any[]>;
        disconnect(): Promise<void>;
        onConnected(callback: () => void): void;
        onDisconnected(callback: () => void): void;
        onError(callback: (error: string) => void): void;
        onEmailsFetched(callback: (emails: any[]) => void): void;
      };
    };
  }
  
  declare global {
    interface Window extends ElectronWindow {}
  }