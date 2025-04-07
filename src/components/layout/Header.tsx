import { Lock, Settings, Key, ShieldCheck, RefreshCw } from 'lucide-react';
import StatusIcon from './StatusIcon';
import HeaderActions from './HeaderActions';

interface HeaderProps {
  status: 'secure' | 'warning' | 'error';
  onSettingsClick?: () => void;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
}

const Header = ({ status, onSettingsClick, onRefreshClick, isRefreshing = false }: HeaderProps) => {
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
    <div 
      className="bg-base-dark border-b border-border-dark"
      style={{ 
        backgroundColor: '#020617', 
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#1e293b' 
      }}
    >
      {/* Main Header */}
      <header 
        className="py-4 px-6"
        style={{ 
          paddingTop: '1rem',
          paddingBottom: '1rem',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem'
        }}
      >
        <div 
          className="flex items-center"
          style={{ 
            display: 'flex', 
            alignItems: 'center' 
          }}
        >
          {/* Logo */}
          <div 
            className="flex items-center space-x-3"
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <div 
              className="text-accent-green"
              style={{ color: '#10b981' }}
            >
              <Lock size={20} />
            </div>
            <h1 
              className="text-white text-lg font-bold tracking-wider"
              style={{ 
                color: 'white',
                fontSize: '1.125rem',
                fontWeight: '700',
                letterSpacing: '0.05em'
              }}
            >SECURE MAIL</h1>
          </div>

          {/* Right side icons */}
          <div 
            className="ml-auto flex items-center space-x-6"
            style={{ 
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem'
            }}
          >
            <StatusIcon status={status} />
            <div title="Refresh Emails">
              <RefreshCw 
                size={20} 
                className={`${isRefreshing ? 'animate-spin text-accent-green' : 'text-gray-400 hover:text-gray-300'} cursor-pointer`}
                onClick={onRefreshClick}
                style={{ 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Key Management">
              <Key 
                size={20} 
                className="text-gray-400 hover:text-gray-300 cursor-pointer"
                style={{ 
                  color: '#9ca3af', 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Security Status">
              <ShieldCheck 
                size={20} 
                className="text-gray-400 hover:text-gray-300 cursor-pointer"
                style={{ 
                  color: '#9ca3af', 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Settings">
              <Settings 
                size={20} 
                className="text-gray-400 hover:text-gray-300 cursor-pointer" 
                onClick={onSettingsClick}
                style={{ 
                  color: '#9ca3af', 
                  cursor: 'pointer'
                }}
              />
            </div>
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