import { useState, useEffect } from 'react';
import { Star, Trash2, Archive, Send, Flag, Inbox, PenSquare, Crown } from 'lucide-react';
import PremiumStatus from '../premium/PremiumStatus';

interface SidebarProps {
  activePath: string;
  setActivePath: (path: string) => void;
  onComposeClick?: () => void;
  onPremiumClick?: () => void;
}

const Sidebar = ({ activePath, setActivePath, onComposeClick, onPremiumClick }: SidebarProps) => {
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumStatus, setShowPremiumStatus] = useState(false);
  
  useEffect(() => {
    // Check premium status on mount
    checkPremiumStatus();
  }, []);
  
  const checkPremiumStatus = async () => {
    try {
      if (window.electron?.premium) {
        const result = await window.electron.premium.getStatus();
        if (result.success && result.status) {
          setIsPremium(result.status.isPremium);
        }
      }
    } catch (err) {
      console.error('Error checking premium status:', err);
    }
  };
  
  const menuItems = [
    { label: 'Inbox', path: 'inbox', icon: <Inbox size={18} /> },
    { label: 'Drafts', path: 'drafts', icon: <PenSquare size={18} /> },
    { label: 'Sent', path: 'sent', icon: <Send size={18} /> },
    { label: 'Archive', path: 'archive', icon: <Archive size={18} /> },
    { label: 'Spam', path: 'spam', icon: <Flag size={18} /> },
    { label: 'Deleted', path: 'deleted', icon: <Trash2 size={18} /> },
    { label: 'Starred', path: 'starred', icon: <Star size={18} /> }
  ];

  return (
    <div className="w-48 bg-secondary-dark flex flex-col h-full border-r border-border-dark relative">
      {/* Compose Button */}
      <div className="p-4 pb-2">
        <button
          onClick={onComposeClick}
          className="w-full bg-accent-green hover:bg-accent-green/90 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"
        >
          <PenSquare size={16} />
          <span>Compose</span>
        </button>
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-2 pr-2 pl-0 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map(item => (
            <li key={item.path}>
              <button
                onClick={() => setActivePath(item.path)}
                className={`relative w-[calc(100%+8px)] ml-[-8px] flex items-center gap-2 p-2 pl-[16px] cursor-pointer text-left transition-all duration-200 ${
                  activePath === item.path 
                    ? 'bg-gradient-to-l from-[#0c1c3d]/80 to-[#12d992]/20 text-white font-medium border-r-2 border-[#12d992] rounded-r-lg z-10' 
                    : 'text-gray-400 hover:bg-gradient-to-l hover:from-[#0c1c3d]/50 hover:to-transparent hover:text-gray-300 hover:rounded-r-lg hover:-translate-x-0.5'
                }`}
                style={activePath === item.path ? {
                  boxShadow: '0 2px 8px rgba(12, 28, 61, 0.3), 4px 0 8px rgba(12, 28, 61, 0.2)'
                } : {}}
              >
                <div className={activePath === item.path ? 'text-accent-green' : ''}>
                  {item.icon}
                </div>
                <span className="text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Premium Status */}
      <div className="px-3 pb-2">
        {showPremiumStatus ? (
          <PremiumStatus 
            showUpgrade={true} 
            onClose={() => setShowPremiumStatus(false)}
          />
        ) : (
          <button 
            onClick={onPremiumClick || (() => setShowPremiumStatus(true))}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
              isPremium 
                ? 'bg-accent-green/20 text-white border border-accent-green/30' 
                : 'bg-gray-700/50 text-gray-400 hover:text-gray-300 hover:bg-gray-700/80 border border-gray-700'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Crown size={16} className={isPremium ? 'text-yellow-400' : 'text-gray-500'} />
              <span>{isPremium ? 'Premium Active' : 'Upgrade to Premium'}</span>
            </div>
            <Star size={16} className={isPremium ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'} />
          </button>
        )}
      </div>
      
      {/* Storage Usage */}
      <div className="p-4 border-t border-border-dark">
        <div className="bg-gray-800 rounded-full h-1.5">
          <div className="bg-accent-green h-1.5 rounded-full" style={{ width: '25%' }} />
        </div>
        <div className="text-xs text-gray-500 mt-2 flex justify-between">
          <span>5GB used</span>
          <span>20GB</span>
        </div>
      </div>
      
      {/* Version */}
      <div className="p-2 text-xs text-gray-600 text-center">
        Secure Mail Client v1.0.8
      </div>
    </div>
  );
};

export default Sidebar;