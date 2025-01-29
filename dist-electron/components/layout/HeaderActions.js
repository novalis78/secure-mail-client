"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const SettingsDialog_1 = __importDefault(require("../layout/SettingsDialog"));
const ActionIcon = ({ icon, tooltip, onClick }) => {
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    return (<div className="relative group">
      <div className="text-gray-400 hover:text-gray-300 cursor-pointer transition-colors" onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
        {icon}
      </div>
      
      {/* Tooltip */}
      {isHovered && (<div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded whitespace-nowrap">
          {tooltip}
        </div>)}
    </div>);
};
const HeaderActions = ({ onAction }) => {
    const [showMoreMenu, setShowMoreMenu] = (0, react_1.useState)(false);
    const [showSettings, setShowSettings] = (0, react_1.useState)(false);
    const actions = [
        { icon: <lucide_react_1.Star size={20}/>, tooltip: 'Star', action: 'star' },
        { icon: <lucide_react_1.Flag size={20}/>, tooltip: 'Flag', action: 'flag' },
        { icon: <lucide_react_1.Trash2 size={20}/>, tooltip: 'Delete', action: 'delete' },
    ];
    return (<>
      <SettingsDialog_1.default isOpen={showSettings} onClose={() => setShowSettings(false)}/>
      <div className="flex items-center space-x-6">
        {/* Main Actions */}
        {actions.map((action, index) => (<ActionIcon key={index} icon={action.icon} tooltip={action.tooltip} onClick={() => onAction(action.action)}/>))}

        {/* Settings Icon */}
        <ActionIcon icon={<lucide_react_1.Settings size={20}/>} tooltip="Settings" onClick={() => setShowSettings(true)}/>

        {/* More Menu */}
        <div className="relative">
          <ActionIcon icon={<lucide_react_1.MoreHorizontal size={20}/>} tooltip="More" onClick={() => setShowMoreMenu(!showMoreMenu)}/>
          
          {showMoreMenu && (<div className="absolute right-0 mt-2 w-48 bg-secondary-dark rounded-xl shadow-lg py-2 z-50">
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark" onClick={() => {
                onAction('mark-read');
                setShowMoreMenu(false);
            }}>
                Mark as Read
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark" onClick={() => {
                onAction('move-to');
                setShowMoreMenu(false);
            }}>
                Move to...
              </button>
            </div>)}
        </div>
      </div>
    </>);
};
exports.default = HeaderActions;
//# sourceMappingURL=HeaderActions.js.map