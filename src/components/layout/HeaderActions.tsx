import { Globe, Settings, MoreHorizontal, Star, Flag, Trash2, Menu } from 'lucide-react';
import { useState } from 'react';
import SettingsDialog from '../layout/SettingsDialog';

interface ActionIconProps {
  icon: React.ReactNode;
  tooltip: string;
  onClick?: () => void;
}

const ActionIcon = ({ icon, tooltip, onClick }: ActionIconProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative group">
      <div
        className="text-gray-400 hover:text-gray-300 cursor-pointer transition-colors"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {icon}
      </div>
      
      {/* Tooltip */}
      {isHovered && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </div>
  );
};

interface HeaderActionsProps {
  onAction: (action: string) => void;
}

const HeaderActions = ({ onAction }: HeaderActionsProps) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const actions = [
    { icon: <Star size={20} />, tooltip: 'Star', action: 'star' },
    { icon: <Flag size={20} />, tooltip: 'Flag', action: 'flag' },
    { icon: <Trash2 size={20} />, tooltip: 'Delete', action: 'delete' },
  ];

  return (
    <>
      <SettingsDialog isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <div className="flex items-center space-x-6">
        {/* Main Actions */}
        {actions.map((action, index) => (
          <ActionIcon
            key={index}
            icon={action.icon}
            tooltip={action.tooltip}
            onClick={() => onAction(action.action)}
          />
        ))}

        {/* Settings Icon removed to avoid duplication - using the one in Header.tsx */}

        {/* More Menu */}
        <div className="relative">
          <ActionIcon
            icon={<MoreHorizontal size={20} />}
            tooltip="More"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          />
          
          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-secondary-dark rounded-xl shadow-lg py-2 z-50">
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark"
                onClick={() => {
                  onAction('mark-read');
                  setShowMoreMenu(false);
                }}
              >
                Mark as Read
              </button>
              <button
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark"
                onClick={() => {
                  onAction('move-to');
                  setShowMoreMenu(false);
                }}
              >
                Move to...
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default HeaderActions;