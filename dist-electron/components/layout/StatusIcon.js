"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const StatusIcon = ({ status = 'secure', onClick }) => {
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const getStatusColor = (status) => {
        switch (status) {
            case 'secure':
                return 'text-accent-green';
            case 'warning':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-400';
        }
    };
    return (<div className="relative group">
      <lucide_react_1.Shield size={20} className={`${getStatusColor(status)} cursor-pointer transition-colors`} onClick={onClick} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}/>
      
      {/* Status Tooltip */}
      {isHovered && (<div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-white rounded whitespace-nowrap">
          {status === 'secure' && 'Connection Secure'}
          {status === 'warning' && 'Warning'}
          {status === 'error' && 'Connection Error'}
        </div>)}
    </div>);
};
exports.default = StatusIcon;
//# sourceMappingURL=StatusIcon.js.map