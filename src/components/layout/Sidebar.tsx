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
    <aside 
      className="w-48 bg-secondary-dark h-full border-r border-border-dark flex flex-col"
      style={{
        width: '12rem',
        backgroundColor: '#0F172A',
        height: '100%',
        borderRightWidth: '1px',
        borderRightStyle: 'solid',
        borderRightColor: '#1e293b',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Compose Button */}
      <div 
        className="p-4"
        style={{ padding: '1rem' }}
      >
        <button
          onClick={onComposeClick}
          className="w-full bg-accent-green hover:bg-accent-green/90 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center justify-center space-x-2"
          style={{
            width: '100%',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '0.5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <PenSquare size={16} />
          <span>Compose</span>
        </button>
      </div>
      
      {/* Navigation Menu */}
      <div className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <div 
            key={item.path}
            onClick={() => setActivePath(item.path)}
            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
              activePath === item.path 
                ? 'bg-accent-green/20 text-accent-green' 
                : 'text-gray-400 hover:bg-hover-dark hover:text-gray-300'
            }`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
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
      <div className="p-4 text-xs text-gray-600">
        Secure Mail Client v1.0.0
      </div>
    </aside>
  );
};

export default Sidebar;