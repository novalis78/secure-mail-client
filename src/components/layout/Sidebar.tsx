import { useState } from 'react';
import { Star, Trash2, Archive, Send, Flag, Inbox, PenSquare } from 'lucide-react';

interface SidebarProps {
  activePath: string;
  setActivePath: (path: string) => void;
  onComposeClick?: () => void;
}

const Sidebar = ({ activePath, setActivePath, onComposeClick }: SidebarProps) => {
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
    <div className="w-48 bg-secondary-dark flex flex-col h-full border-r border-border-dark">
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
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map(item => (
            <li key={item.path}>
              <button
                onClick={() => setActivePath(item.path)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg cursor-pointer text-left ${
                  activePath === item.path 
                    ? 'bg-accent-green/20 text-accent-green' 
                    : 'text-gray-400 hover:bg-hover-dark hover:text-gray-300'
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
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
        Secure Mail Client v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;