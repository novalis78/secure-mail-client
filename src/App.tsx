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
}

function App() {
  const [activePath, setActivePath] = useState('inbox');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [emails, setEmails] = useState<Mail[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'secure' | 'warning' | 'error'>('secure');

  useEffect(() => {
    if (!(window as any).electron?.imap) {
      console.log('IMAP functionality not available - are you running in Electron?');
      return;
    }

    window.electron.imap.onEmailsFetched((fetchedEmails: Mail[]) => {
      setEmails(fetchedEmails);
    });

    window.electron.imap.onError(() => {
      setConnectionStatus('error');
    });

    window.electron.imap.onConnected(() => {
      setConnectionStatus('secure');
    });

    window.electron.imap.onDisconnected(() => {
      setConnectionStatus('warning');
    });
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
          <div className="flex-shrink-0 w-mail-list min-w-[280px] max-w-[550px] border-r border-border-dark relative">
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
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-border-dark/50 hover:bg-accent-green/50 z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                
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
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
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