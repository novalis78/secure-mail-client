import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MailList from './components/mail/MailList';
import ComposeEmail from './components/mail/ComposeEmail';
import MailDetail from './components/mail/MailDetail';
import SettingsDialog from './components/layout/SettingsDialog';
import Contacts from './components/contacts/Contacts';

export interface Mail {
  id: string;
  from: string;
  subject: string;
  status: 'NEW' | 'MESSAGE_VIEWED';
  isEncrypted: boolean;
  date: Date;
  text?: string;
  html?: string | null;
  body?: string;  // Add body field based on console output
  labelIds?: string[];
  folder?: string;
}

function App() {
  const [activePath, setActivePath] = useState('inbox');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Mail[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('email'); 
  const [connectionStatus, setConnectionStatus] = useState<'secure' | 'warning' | 'error'>('secure');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showContacts, setShowContacts] = useState(false);

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
            user: credentialsResult.credentials.email || '',
            password: credentialsResult.credentials.password || '',
            host: credentialsResult.credentials.host || 'imap.gmail.com',
            port: credentialsResult.credentials.port || 993
          });
          
          if (connectResult.success) {
            console.log('Connected successfully, fetching emails');
            // Now fetch emails
            await window.electron.imap.fetchEmails();
          } else {
            console.error('Failed to connect with stored credentials:', connectResult.error);
            // Don't automatically show settings dialog on startup
            // Just log the error and let user click settings if they want
          }
        } catch (connectError) {
          console.error('Error connecting with stored credentials:', connectError);
          // Don't automatically show settings dialog on startup
        }
      } else {
        // Only fetch emails (let the backend handle connection if possible)
        const result = await window.electron.imap.fetchEmails();
        
        // Even if fetching failed, don't automatically show settings
        if (!result.success) {
          console.log('Connection required but no credentials found');
          // Don't automatically show settings dialog on startup
        }
      }
    } catch (error) {
      console.error('Error during refresh process:', error);
      // Don't automatically show settings dialog on startup
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
      console.log("Emails fetched event received, count:", fetchedEmails.length);
      
      // Log the first email to debug content issues
      if (fetchedEmails.length > 0) {
        const firstEmail = fetchedEmails[0];
        console.log("First fetched email debug:", {
          id: firstEmail.id,
          subject: firstEmail.subject,
          hasText: typeof firstEmail.text === 'string',
          textLength: firstEmail.text ? String(firstEmail.text).length : 0,
          hasHtml: typeof firstEmail.html === 'string',
          htmlLength: firstEmail.html ? String(firstEmail.html).length : 0
        });
      }
      
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

  // Add debug logging to see what's happening with email selection
  const selectedEmail = emails.find(email => email.id === selectedMailId);
  
  useEffect(() => {
    if (selectedMailId) {
      console.log("Selected mail ID:", selectedMailId);
      console.log("Found email object:", selectedEmail);
      
      if (selectedEmail) {
        // Log email properties to check for text content
        console.log("Email content available:", {
          hasText: !!selectedEmail.text,
          hasHtml: !!selectedEmail.html,
          textLength: selectedEmail.text?.length || 0,
          htmlLength: selectedEmail.html?.length || 0
        });
      } else {
        console.log("No email found with that ID in emails array:", emails.map(e => e.id));
      }
    }
  }, [selectedMailId, selectedEmail]);

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
        onContactsClick={() => setShowContacts(true)}
        selectedEmail={!!selectedEmail}
        onClose={() => window.electron.app.close()}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activePath={activePath} 
          setActivePath={setActivePath}
          onComposeClick={handleComposeClick}
          onPremiumClick={() => {
            setActiveSettingsTab('premium');
            setShowSettings(true);
          }}
        />
        
        {/* Resizable Layout */}
        <div className="flex flex-1 relative">
          {/* Email List Panel */}
          <div className="flex-shrink-0 w-[350px] min-w-[280px] max-w-[550px] border-r border-border-dark flex flex-col h-full overflow-hidden">
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
          <main className="flex-1 bg-base-dark overflow-auto w-full flex">
            {isComposing ? (
              <ComposeEmail onCancel={() => setIsComposing(false)} />
            ) : selectedEmail ? (
              <MailDetail email={selectedEmail} />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full text-center text-gray-500 px-4">
                <div className="flex items-center justify-center w-16 h-16 mb-4 bg-secondary-dark/50 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                </div>
                <p className="text-sm font-medium mb-2">No message selected</p>
                <p className="text-xs text-gray-600 max-w-md mx-auto">Select an email from the list to view its contents</p>
              </div>
            )}
          </main>
        </div>
      </div>

      <SettingsDialog 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        initialTab={activeSettingsTab}
      />
      
      {/* Contacts View */}
      {showContacts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-secondary-dark w-full max-w-6xl h-[90vh] rounded-lg overflow-hidden shadow-xl">
            <Contacts onClose={() => setShowContacts(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;