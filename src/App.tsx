import { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MailList from './components/mail/MailList';
import ComposeEmail from './components/mail/ComposeEmail';

function App() {
  const [activePath, setActivePath] = useState('all');
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-base-dark text-white">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePath={activePath} setActivePath={setActivePath} />
        
        {/* Email List Panel */}
        <div className="w-mail-list border-r border-border-dark">
          <MailList 
            selectedMailId={selectedMailId}
            onSelectMail={setSelectedMailId}
          />
        </div>

        {/* Main Content Panel */}
        <main className="flex-1 bg-base-dark">
          <ComposeEmail />
        </main>
      </div>
    </div>
  );
}

export default App;