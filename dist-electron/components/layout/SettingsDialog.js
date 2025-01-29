"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const dialog_1 = require("../../components/ui/dialog");
const ErrorBoundary_1 = __importDefault(require("../../components/common/ErrorBoundary"));
const SettingsDialog = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = (0, react_1.useState)('email');
    const tabs = [
        { id: 'email', label: 'Email Settings', icon: lucide_react_1.Mail },
        { id: 'keys', label: 'Key Management', icon: lucide_react_1.Key },
        { id: 'yubikey', label: 'YubiKey', icon: lucide_react_1.Usb },
    ];
    return (<ErrorBoundary_1.default>
    <dialog_1.Dialog open={isOpen} onOpenChange={onClose}>
      <dialog_1.DialogContent className="max-w-7xl h-3/4 bg-secondary-dark border border-border-dark">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <lucide_react_1.Shield className="w-5 h-5"/>
            Settings
          </dialog_1.DialogTitle>
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white">
            <lucide_react_1.X className="w-5 h-5"/>
          </button>
        </dialog_1.DialogHeader>

        <div className="flex h-full mt-4">
          {/* Sidebar */}
          <div className="w-48 border-r border-border-dark">
            {tabs.map((tab) => {
            const Icon = tab.icon;
            return (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${activeTab === tab.id
                    ? 'bg-accent-green/20 text-accent-green'
                    : 'text-gray-400 hover:bg-hover-dark hover:text-white'}`}>
                  <Icon className="w-4 h-4"/>
                  {tab.label}
                </button>);
        })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'email' && <EmailSettings />}
            {activeTab === 'keys' && <KeyManagement />}
            {activeTab === 'yubikey' && <YubiKeySettings />}
          </div>
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>
    </ErrorBoundary_1.default>);
};
const EmailSettings = () => {
    const [email, setEmail] = (0, react_1.useState)('');
    const [password, setPassword] = (0, react_1.useState)('');
    const [status, setStatus] = (0, react_1.useState)('disconnected');
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        // Check if IMAP methods are available
        if (!window.electron?.imap) {
            console.log('IMAP functionality not available - are you running in Electron?');
            return;
        }
        const setupListeners = () => {
            window.electron.imap.onConnected(() => {
                setStatus('connected');
                setError(null);
            });
            window.electron.imap.onDisconnected(() => {
                setStatus('disconnected');
            });
            window.electron.imap.onError((errorMsg) => {
                setStatus('error');
                setError(errorMsg);
            });
            window.electron.imap.onEmailsFetched((emails) => {
                console.log('Received emails:', emails);
            });
        };
        setupListeners();
        return () => {
            window.electron.imap.disconnect().catch(console.error);
        };
    }, []);
    const handleSave = async () => {
        if (!window.electron?.imap) {
            setError('IMAP functionality only available in Electron environment');
            return;
        }
        try {
            setError(null);
            await window.electron.imap.connect({
                user: email,
                password: password
            });
            await window.electron.imap.fetchEmails();
        }
        catch (err) {
            setStatus('error');
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        }
    };
    return (<div className="space-y-6">
        <h3 className="text-lg font-medium text-white">Gmail IMAP Configuration</h3>
        
        {status === 'error' && error && (<div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
            {error}
          </div>)}
        
        {status === 'connected' && (<div className="bg-green-500/10 text-green-500 p-4 rounded-lg">
            Connected successfully
          </div>)}
  
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white" placeholder="your.email@gmail.com"/>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">App Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white" placeholder="Gmail App Password"/>
            <p className="text-xs text-gray-500">
              Use an App Password generated from your Google Account settings
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-400">IMAP Settings</label>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white" placeholder="imap.gmail.com" defaultValue="imap.gmail.com" disabled/>
              <input type="number" className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white" placeholder="993" defaultValue="993" disabled/>
            </div>
          </div>
          <button onClick={handleSave} className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
            {status === 'connected' ? 'Reconnect' : 'Save Configuration'}
          </button>
        </div>
      </div>);
};
const KeyManagement = () => (<div className="space-y-6">
    <h3 className="text-lg font-medium text-white">PGP Key Management</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Import Public Key</label>
        <textarea className="w-full h-32 bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white" placeholder="Paste PGP public key here..."/>
      </div>
      <button className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
        Import Key
      </button>
      
      <div className="mt-8">
        <h4 className="text-md font-medium text-white mb-4">Stored Keys</h4>
        <div className="space-y-2">
          {/* Example stored key */}
          <div className="bg-base-dark border border-border-dark rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white">alice@example.com</p>
                <p className="text-xs text-gray-400">Fingerprint: 2345 6789 ABCD EFGH</p>
              </div>
              <button className="text-red-500 hover:text-red-400">
                <lucide_react_1.X className="w-4 h-4"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>);
const YubiKeySettings = () => (<div className="space-y-6">
    <h3 className="text-lg font-medium text-white">YubiKey Configuration</h3>
    <div className="space-y-4">
      <div className="p-4 bg-base-dark border border-border-dark rounded-lg">
        <p className="text-gray-400">Status: No YubiKey detected</p>
      </div>
      <button className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
        Detect YubiKey
      </button>
      
      <div className="mt-4">
        <h4 className="text-md font-medium text-white mb-2">Options</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="form-checkbox"/>
            <span className="text-gray-400">Auto-detect YubiKey on startup</span>
          </label>
        </div>
      </div>
    </div>
  </div>);
exports.default = SettingsDialog;
//# sourceMappingURL=SettingsDialog.js.map