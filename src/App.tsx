import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MailList from './components/mail/MailList';
import ComposeEmail from './components/mail/ComposeEmail';
import MailDetail from './components/mail/MailDetail';
import SettingsDialog from './components/layout/SettingsDialog';

export interface Mail {
  id: string;
  from: string;
  subject: string;
  status: 'NEW' | 'MESSAGE_VIEWED';
  isEncrypted: boolean;
  date: Date;
  text?: string;
  html?: string | null;
  labelIds?: string[];
  folder?: string;
}

function App() {
  const [activePath, setActivePath] = useState('inbox');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Mail[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'secure' | 'warning' | 'error'>('secure');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshEmails = async () => {
    if (!(window as any).electron?.imap) {
      console.log('IMAP functionality not available - are you running in Electron?');
      return;
    }
    
    setIsRefreshing(true);
    
    try {
      // First check if we have credentials stored
      const credentialsResult = await window.electron.credentials.getImap();
      
      // If we have credentials, try to connect and fetch emails
      if (credentialsResult.success && credentialsResult.credentials) {
        console.log('Found stored credentials, trying to connect and fetch emails');
        
        try {
          // Try to connect first
          const connectResult = await window.electron.imap.connect({
            user: credentialsResult.credentials.email,
            password: credentialsResult.credentials.password,
            host: credentialsResult.credentials.host || 'imap.gmail.com',
            port: credentialsResult.credentials.port || 993
          });
          
          if (connectResult.success) {
            console.log('Connected successfully, fetching emails');
            // Now fetch emails
            await window.electron.imap.fetchEmails();
          } else {
            console.error('Failed to connect with stored credentials:', connectResult.error);
            // Only show settings as a last resort if connection fails
            setShowSettings(true);
          }
        } catch (connectError) {
          console.error('Error connecting with stored credentials:', connectError);
          setShowSettings(true);
        }
      } else {
        // Only fetch emails (let the backend handle connection if possible)
        const result = await window.electron.imap.fetchEmails();
        
        // If fetching still failed and it's due to connection, show settings
        if (!result.success && result.error?.includes('Not connected to IMAP server')) {
          console.log('Connection required but no credentials found, showing settings dialog');
          setShowSettings(true);
        }
      }
    } catch (error) {
      console.error('Error during refresh process:', error);
      // Only show settings as a last resort
      setShowSettings(true);
    } finally {
      // Always reset the refreshing state when done
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!(window as any).electron?.imap) {
      console.log('IMAP functionality not available - are you running in Electron?');
      return;
    }

    window.electron.imap.onEmailsFetched((fetchedEmails: Mail[]) => {
      setEmails(fetchedEmails);
      setIsRefreshing(false);
    });

    window.electron.imap.onError(() => {
      setConnectionStatus('error');
      setIsRefreshing(false);
    });

    window.electron.imap.onConnected(() => {
      setConnectionStatus('secure');
      // Auto-refresh emails when connected
      refreshEmails();
    });

    window.electron.imap.onDisconnected(() => {
      setConnectionStatus('warning');
      setIsRefreshing(false);
    });
    
    // Auto-refresh emails on startup
    refreshEmails();
  }, []);

  const selectedEmail = emails.find(email => email.id === selectedMailId);

  const handleComposeClick = () => {
    setIsComposing(true);
    setSelectedMailId(null);
  };

  return (
    <div className="h-screen flex flex-col bg-base-dark text-white">
      <Header 
        status={connectionStatus} 
        onSettingsClick={() => setShowSettings(true)}
        onRefreshClick={refreshEmails}
        isRefreshing={isRefreshing}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activePath={activePath} 
          setActivePath={setActivePath}
          onComposeClick={handleComposeClick}
        />
        
        {/* Resizable Layout */}
        <div className="flex flex-1 relative">
          {/* Email List Panel */}
          <div className="flex-shrink-0 w-mail-list min-w-[280px] max-w-[550px] border-r border-border-dark flex flex-col h-full overflow-hidden">
            <MailList 
              emails={emails}
              selectedMailId={selectedMailId}
              onSelectMail={(id) => {
                setSelectedMailId(id);
                setIsComposing(false);
              }}
            />
            {/* Resizable Handle */}
            <div 
              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-accent-green/30 z-10 group"
              onMouseDown={(e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                
                // Add an overlay to capture mouse events during resize
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0';
                overlay.style.left = '0';
                overlay.style.right = '0';
                overlay.style.bottom = '0';
                overlay.style.zIndex = '1000';
                overlay.style.cursor = 'col-resize';
                document.body.appendChild(overlay);
                
                const startX = e.clientX;
                const listPanel = e.currentTarget.parentElement;
                if (!listPanel) return;
                
                const startWidth = listPanel.getBoundingClientRect().width;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = startWidth + moveEvent.clientX - startX;
                  if (newWidth >= 280 && newWidth <= 550) {
                    listPanel.style.width = `${newWidth}px`;
                  }
                };
                
                const onMouseUp = () => {
                  document.body.style.cursor = '';
                  document.body.removeChild(overlay);
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="invisible group-hover:visible w-0.5 h-full mx-auto bg-accent-green/70"></div>
            </div>
          </div>

          {/* Main Content Panel */}
          <main className="flex-1 bg-base-dark overflow-auto w-full">
            {isComposing ? (
              <ComposeEmail onCancel={() => setIsComposing(false)} />
            ) : selectedEmail ? (
              <MailDetail email={selectedEmail} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>Select an email to view its contents</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <SettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}

export default App;