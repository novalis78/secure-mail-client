import { Lock, Settings, Key, ShieldCheck, RefreshCw, Globe, X } from 'lucide-react';
import StatusIcon from './StatusIcon';
import HeaderActions from './HeaderActions';

interface HeaderProps {
  status: 'secure' | 'warning' | 'error';
  onSettingsClick?: () => void;
  onRefreshClick?: () => void;
  isRefreshing?: boolean;
  onContactsClick?: () => void;
  selectedEmail?: boolean;
  onClose?: () => void;
}

const Header = ({ status, onSettingsClick, onRefreshClick, isRefreshing = false, onContactsClick, selectedEmail = false, onClose }: HeaderProps) => {
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
      className="bg-[#030b1a] border-b border-[#0c1c3d]"
      style={{ 
        background: 'linear-gradient(to bottom, #041024, #030b1a)',
        borderBottomWidth: '1px',
        borderBottomStyle: 'solid',
        borderBottomColor: '#0c1c3d',
        boxShadow: 'inset 0 -1px 0 0 rgba(6, 46, 93, 0.2)',
        WebkitAppRegion: 'drag' // Make entire header draggable
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
              className="text-[#12d992]"
              style={{ 
                color: '#12d992',
                filter: 'drop-shadow(0 0 4px rgba(18, 217, 146, 0.3))'
              }}
            >
              <Lock size={22} />
            </div>
            <h1 
              className="text-white text-lg font-bold tracking-widest uppercase"
              style={{ 
                color: 'white',
                fontSize: '1.125rem',
                fontWeight: '800',
                letterSpacing: '0.12em',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.1)'
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
            <div style={{ WebkitAppRegion: 'no-drag' }}>
              <StatusIcon status={status} />
            </div>
            <div title="Refresh Emails" style={{ WebkitAppRegion: 'no-drag' }}>
              <RefreshCw 
                size={20} 
                className={`${isRefreshing ? 'animate-spin text-accent-green' : 'text-gray-400 hover:text-gray-300'} cursor-pointer`}
                onClick={onRefreshClick}
                style={{ 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Contacts" style={{ WebkitAppRegion: 'no-drag' }}>
              <Globe 
                size={20} 
                className="text-gray-400 hover:text-gray-300 cursor-pointer"
                onClick={onContactsClick}
                style={{ 
                  color: '#9ca3af', 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Security Status" style={{ WebkitAppRegion: 'no-drag' }}>
              <ShieldCheck 
                size={20} 
                className="text-gray-400 hover:text-gray-300 cursor-pointer"
                style={{ 
                  color: '#9ca3af', 
                  cursor: 'pointer'
                }}
              />
            </div>
            <div title="Settings" style={{ WebkitAppRegion: 'no-drag' }}>
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
            
            {onClose && (
              <div 
                title="Close Application" 
                style={{ 
                  WebkitAppRegion: 'no-drag',
                  marginLeft: '0.5rem'
                }}
              >
                <X 
                  size={22} 
                  className="text-gray-400 hover:text-red-400 transition-colors duration-200 cursor-pointer" 
                  onClick={onClose}
                  style={{ 
                    cursor: 'pointer'
                  }}
                />
              </div>
            )}
            {selectedEmail && (
              <div style={{ WebkitAppRegion: 'no-drag' }}>
                <HeaderActions onAction={handleAction} />
              </div>
            )}
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
      
      {/* Version number removed - using the one in the footer instead */}
    </div>
  );
};

export default Header;