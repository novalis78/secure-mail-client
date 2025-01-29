import { Lock, Search, Globe, Settings } from 'lucide-react';
import StatusIcon from './StatusIcon';
import HeaderActions from './HeaderActions';
import { useState } from 'react';

const Header = () => {
  const [connectionStatus, setConnectionStatus] = useState<'secure' | 'warning' | 'error'>('secure');

  const handleAction = (action: string) => {
    // Handle different actions
    switch (action) {
      case 'star':
        console.log('Star message');
        break;
      case 'flag':
        console.log('Flag message');
        break;
      case 'delete':
        console.log('Delete message');
        break;
      // Add more actions as needed
    }
  };

  return (
    <div className="bg-base-dark">
      {/* Main Header */}
      <header className="py-4 px-6">
        <div className="flex items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-accent-green">
              <Lock size={20} />
            </div>
            <h1 className="text-white text-lg font-medium">Secure Mail</h1>
          </div>

          {/* Search */}
          <div className="relative ml-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder="Search..."
              className="w-[400px] bg-secondary-dark text-white pl-12 pr-4 py-2.5 rounded-xl focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Right side icons */}
          <div className="ml-auto flex items-center space-x-6">
            <StatusIcon 
              status={connectionStatus}
              onClick={() => {
                // Cycle through statuses for demo
                const statuses: ('secure' | 'warning' | 'error')[] = ['secure', 'warning', 'error'];
                const currentIndex = statuses.indexOf(connectionStatus);
                const nextIndex = (currentIndex + 1) % statuses.length;
                setConnectionStatus(statuses[nextIndex]);
              }}
            />
            <Globe size={20} className="text-gray-400 hover:text-gray-300 cursor-pointer" />
            <Settings size={20} className="text-gray-400 hover:text-gray-300 cursor-pointer" />
            <HeaderActions onAction={handleAction} />
          </div>
        </div>
      </header>

      {/* Status Bar - Optional */}
      {connectionStatus !== 'secure' && (
        <div className={`px-6 py-2 text-sm ${
          connectionStatus === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {connectionStatus === 'warning' ? 'Warning: Connection may not be secure' : 'Error: Connection is not secure'}
        </div>
      )}
    </div>
  );
};

export default Header;