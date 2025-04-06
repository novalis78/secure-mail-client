import { Lock, Search, Globe, Settings, Key, ShieldCheck } from 'lucide-react';
import StatusIcon from './StatusIcon';
import HeaderActions from './HeaderActions';

interface HeaderProps {
  status: 'secure' | 'warning' | 'error';
  onSettingsClick?: () => void;
}

const Header = ({ status, onSettingsClick }: HeaderProps) => {
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
    <div className="bg-base-dark border-b border-border-dark">
      {/* Main Header */}
      <header className="py-4 px-6">
        <div className="flex items-center">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-accent-green">
              <Lock size={20} />
            </div>
            <h1 className="text-white text-lg font-medium">SECURE MAIL</h1>
          </div>

          {/* Right side icons */}
          <div className="ml-auto flex items-center space-x-6">
            <StatusIcon status={status} />
            <Key size={20} className="text-gray-400 hover:text-gray-300 cursor-pointer" title="Key Management" />
            <ShieldCheck size={20} className="text-gray-400 hover:text-gray-300 cursor-pointer" title="Security Status" />
            <Settings 
              size={20} 
              className="text-gray-400 hover:text-gray-300 cursor-pointer" 
              onClick={onSettingsClick}
              title="Settings"
            />
            <HeaderActions onAction={handleAction} />
          </div>
        </div>
      </header>

      {/* Status Bar - Optional */}
      {status !== 'secure' && (
        <div className={`px-6 py-2 text-sm ${
          status === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
        }`}>
          {status === 'warning' ? 'Warning: Connection may not be secure' : 'Error: Connection is not secure'}
        </div>
      )}
      
      {/* Version Number */}
      <div className="absolute top-4 right-4 text-xs text-gray-600">
        v2.872
      </div>
    </div>
  );
};

export default Header;