import { Star, Trash2, Archive, Send, Flag, Inbox } from 'lucide-react';

interface SidebarProps {
  activePath: string;
}

const Sidebar = ({ activePath }: SidebarProps) => {
  const menuItems = [
    { label: 'Drafts', path: 'drafts', icon: <Send size={18} /> },
    { label: 'Sent', path: 'sent', icon: <Send size={18} /> },
    { label: 'Archive', path: 'archive', icon: <Archive size={18} /> },
    { label: 'Spam', path: 'spam', icon: <Flag size={18} /> },
    { label: 'Proj-keep', path: 'proj-keep', icon: <Inbox size={18} /> },
    { label: 'Deleted', path: 'deleted', icon: <Trash2 size={18} /> },
    { label: 'Starred', path: 'starred', icon: <Star size={18} /> }
  ];

  return (
    <aside className="w-48 bg-gray-900 h-full border-r border-gray-800">
      <div className="p-2 space-y-1">
        {menuItems.map(item => (
          <div 
            key={item.path}
            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer ${
              activePath === item.path 
                ? 'bg-green-500/20 text-green-500' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'
            }`}
          >
            {item.icon}
            <span className="text-sm">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 p-4 w-48">
        <div className="bg-gray-800 rounded-full h-1">
          <div className="bg-green-500 h-1 rounded-full" style={{ width: '25%' }} />
        </div>
        <div className="text-xs text-gray-500 mt-2">5/20GB</div>
      </div>
    </aside>
  );
};

export default Sidebar;