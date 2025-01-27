interface SidebarProps {
  activePath: string;
}

const Sidebar = ({ activePath }: SidebarProps) => {
  const menuItems = [
    { label: 'All', path: 'all' },
    { label: 'Read', path: 'read' },
    { label: 'Unread', path: 'unread' }
  ];

  return (
    <aside className="w-64 bg-gray-900 h-full border-r border-gray-800">
      <div className="p-4">
        {menuItems.map(item => (
          <div 
            key={item.path}
            className={`p-2 rounded cursor-pointer ${
              activePath === item.path ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-800'
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
