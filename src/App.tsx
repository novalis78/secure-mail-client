import { useState } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import MailList from './components/mail/MailList';

function App() {
  const [activePath, setActivePath] = useState('all');

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePath={activePath} />
        <main className="flex-1 overflow-auto p-4">
          <MailList />
        </main>
      </div>
    </div>
  );
}

export default App;
