import React, { useState, useEffect } from 'react';
import { X, Mail, Key, Shield, Usb, Loader, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import ErrorBoundary from '../../components/common/ErrorBoundary';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsDialog = ({ isOpen, onClose }: SettingsDialogProps) => {
  const [activeTab, setActiveTab] = useState('email');
  
  const tabs = [
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'keys', label: 'Key Management', icon: Key },
    { id: 'yubikey', label: 'YubiKey', icon: Usb },
  ];

  return (
    <ErrorBoundary>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl h-3/4 bg-secondary-dark border border-border-dark">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Settings
            </DialogTitle>
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogHeader>

          <div className="flex h-full mt-4">
            <div className="w-48 border-r border-border-dark">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${
                      activeTab === tab.id
                        ? 'bg-accent-green/20 text-accent-green'
                        : 'text-gray-400 hover:bg-hover-dark hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'email' && <EmailSettings />}
              {activeTab === 'keys' && <KeyManagement />}
              {activeTab === 'yubikey' && <YubiKeySettings />}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  );
};

const EmailSettings = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (!(window as any).electron?.imap) {
      console.log('IMAP functionality not available - are you running in Electron?');
      return;
    }

    const setupListeners = () => {
      window.electron.imap.onStatus((message: string) => {
        setStatusMessage(message);
      });

      window.electron.imap.onConnected(() => {
        setStatus('connected');
        setError(null);
        setIsLoading(false);
      });

      window.electron.imap.onDisconnected(() => {
        setStatus('disconnected');
        setIsLoading(false);
      });

      window.electron.imap.onError((errorMsg: string) => {
        setStatus('error');
        setError(errorMsg);
        setIsLoading(false);
      });

      window.electron.imap.onEmailsFetched((emails) => {
        console.log('Received emails:', emails);
      });
    };

    setupListeners();

    return () => {
      if ((window as any).electron?.imap) {
        window.electron.imap.disconnect().catch(console.error);
      }
    };
  }, []);

  const handleSave = async () => {
    if (!(window as any).electron?.imap) {
      setError('IMAP functionality only available in Electron environment');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setStatus('connecting');
      await window.electron.imap.connect({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993
      });

      // Fetch emails will be triggered automatically after connection
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">Gmail IMAP Configuration</h3>
      
      {status === 'error' && error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      {status === 'connecting' && (
        <div className="bg-yellow-500/10 text-yellow-500 p-4 rounded-lg flex items-center gap-2">
          <Loader className="w-4 h-4 animate-spin" />
          <span>{statusMessage || 'Connecting to IMAP server...'}</span>
        </div>
      )}

      {status === 'connected' && (
        <div className="bg-green-500/10 text-green-500 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Connected successfully</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
            placeholder="your.email@gmail.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">App Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
            placeholder="Gmail App Password"
          />
          <p className="text-xs text-gray-500">
            Use an App Password generated from your Google Account settings
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-400">IMAP Settings</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
              placeholder="imap.gmail.com"
              defaultValue="imap.gmail.com"
              disabled
            />
            <input
              type="number"
              className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
              placeholder="993"
              defaultValue="993"
              disabled
            />
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isLoading || !email || !password}
          className={`bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 transition-colors
            ${(isLoading || !email || !password) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Connecting...</span>
            </div>
          ) : status === 'connected' ? (
            'Reconnect'
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
    </div>
  );
};

const KeyManagement = () => {
  const [publicKeyInput, setPublicKeyInput] = useState('');
  const [keys, setKeys] = useState<Array<{
    fingerprint: string;
    email: string;
    name?: string;
    isDefault?: boolean;
    hasPrivateKey?: boolean;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGenerateKey, setShowGenerateKey] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    email: '',
    passphrase: '',
    confirmPassphrase: ''
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    if (!(window as any).electron?.pgp) {
      setError('PGP functionality not available - are you running in Electron?');
      return;
    }

    try {
      setIsLoading(true);
      const result = await window.electron.pgp.getPublicKeys();
      
      if (result.success && result.keys) {
        setKeys(result.keys);
      } else {
        setError(result.error || 'Failed to load keys');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportKey = async () => {
    if (!publicKeyInput.trim()) {
      setError('Please enter a PGP public key');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await window.electron.pgp.importPublicKey({
        armoredKey: publicKeyInput
      });
      
      if (result.success) {
        setSuccess('Public key imported successfully');
        setPublicKeyInput('');
        loadKeys();
      } else {
        setError(result.error || 'Failed to import key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (fingerprint: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electron.pgp.deleteKey({ fingerprint });
      
      if (result.success) {
        setSuccess('Key deleted successfully');
        loadKeys();
      } else {
        setError(result.error || 'Failed to delete key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultKey = async (fingerprint: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electron.pgp.setDefaultKey({ fingerprint });
      
      if (result.success) {
        setSuccess('Default key updated');
        loadKeys();
      } else {
        setError(result.error || 'Failed to set default key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (newKeyData.passphrase !== newKeyData.confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    if (!newKeyData.name || !newKeyData.email || !newKeyData.passphrase) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electron.pgp.generateKey({
        name: newKeyData.name,
        email: newKeyData.email,
        passphrase: newKeyData.passphrase
      });
      
      if (result.success) {
        setSuccess('Key pair generated successfully');
        setShowGenerateKey(false);
        setNewKeyData({
          name: '',
          email: '',
          passphrase: '',
          confirmPassphrase: ''
        });
        loadKeys();
      } else {
        setError(result.error || 'Failed to generate key pair');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">PGP Key Management</h3>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 text-green-500 p-4 rounded-lg">
          {success}
        </div>
      )}

      {showGenerateKey ? (
        <div className="space-y-4 bg-secondary-dark p-4 rounded-lg">
          <h4 className="text-md font-medium text-white">Generate New PGP Key Pair</h4>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Full Name</label>
              <input
                type="text"
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({...newKeyData, name: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                placeholder="Your Full Name"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Email Address</label>
              <input
                type="email"
                value={newKeyData.email}
                onChange={(e) => setNewKeyData({...newKeyData, email: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Passphrase</label>
              <input
                type="password"
                value={newKeyData.passphrase}
                onChange={(e) => setNewKeyData({...newKeyData, passphrase: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                placeholder="Strong passphrase for your key"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Confirm Passphrase</label>
              <input
                type="password"
                value={newKeyData.confirmPassphrase}
                onChange={(e) => setNewKeyData({...newKeyData, confirmPassphrase: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                placeholder="Confirm passphrase"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleGenerateKey}
              disabled={isLoading}
              className={`bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 flex-1 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Key Pair'
              )}
            </button>
            
            <button
              onClick={() => setShowGenerateKey(false)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGenerateKey(true)}
            className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90"
          >
            Generate New Key Pair
          </button>
        </div>
      )}
      
      <div className="space-y-4 mt-6">
        <h4 className="text-md font-medium text-white">Import Existing Public Key</h4>
        <div className="space-y-2">
          <textarea
            value={publicKeyInput}
            onChange={(e) => setPublicKeyInput(e.target.value)}
            className="w-full h-32 bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white font-mono text-sm"
            placeholder="Paste PGP public key here..."
          />
        </div>
        <button 
          onClick={handleImportKey}
          disabled={isLoading || !publicKeyInput.trim()}
          className={`bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 ${
            (isLoading || !publicKeyInput.trim()) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Importing...</span>
            </div>
          ) : (
            'Import Key'
          )}
        </button>
      </div>
      
      <div className="mt-8">
        <h4 className="text-md font-medium text-white mb-4">Stored Keys</h4>
        
        {isLoading && keys.length === 0 ? (
          <div className="flex justify-center py-4">
            <Loader className="w-6 h-6 animate-spin text-accent-green" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No PGP keys found
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {keys.map((key) => (
              <div key={key.fingerprint} className="bg-base-dark border border-border-dark rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-white">{key.email}</p>
                      {key.isDefault && (
                        <span className="bg-accent-green/20 text-accent-green px-2 py-0.5 rounded text-xs">
                          Default
                        </span>
                      )}
                      {key.hasPrivateKey && (
                        <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
                          Private Key
                        </span>
                      )}
                    </div>
                    {key.name && <p className="text-sm text-gray-400">{key.name}</p>}
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {key.fingerprint}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {!key.isDefault && key.hasPrivateKey && (
                      <button 
                        onClick={() => handleSetDefaultKey(key.fingerprint)}
                        className="text-accent-green hover:text-accent-green/80"
                        title="Set as default key"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteKey(key.fingerprint)}
                      className="text-red-500 hover:text-red-400"
                      title="Delete key"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const YubiKeySettings = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [keyDetected, setKeyDetected] = useState(false);
  const [keyInfo, setKeyInfo] = useState<null | {
    serial: string;
    version: string;
    pgpKeyId: string;
  }>(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [useNFC, setUseNFC] = useState(false);
  const [requireYubiKey, setRequireYubiKey] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-detect YubiKey on component mount if autoDetect is enabled
    if (autoDetect) {
      handleDetectYubiKey();
    }
  }, []);

  const handleDetectYubiKey = async () => {
    if (!(window as any).electron?.yubikey) {
      setError('YubiKey functionality not available - are you running in Electron?');
      return;
    }

    setIsDetecting(true);
    setError(null);
    
    try {
      const result = await window.electron.yubikey.detect();
      
      if (result.success && result.yubikey) {
        setKeyDetected(result.yubikey.detected);
        if (result.yubikey.detected) {
          setKeyInfo({
            serial: result.yubikey.serial,
            version: result.yubikey.version,
            pgpKeyId: result.yubikey.pgpKeyId
          });
        }
      } else {
        setError(result.error || 'Failed to detect YubiKey');
        setKeyDetected(false);
        setKeyInfo(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setKeyDetected(false);
      setKeyInfo(null);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-white">YubiKey Configuration</h3>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className={`p-6 border rounded-lg ${
          keyDetected 
            ? 'bg-accent-green/10 border-accent-green/30' 
            : 'bg-base-dark border-border-dark'
        }`}>
          {keyDetected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-accent-green font-medium">YubiKey Detected</h4>
                <div className="bg-accent-green/20 text-accent-green px-2 py-1 rounded text-xs">
                  Connected
                </div>
              </div>
              
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Serial Number:</span>
                  <span className="text-white font-mono">{keyInfo?.serial}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Firmware Version:</span>
                  <span className="text-white font-mono">{keyInfo?.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">PGP Key ID:</span>
                  <span className="text-white font-mono">{keyInfo?.pgpKeyId}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400">No YubiKey detected</p>
              <p className="text-xs text-gray-500 mt-2">
                Connect your YubiKey to the USB port or NFC pad
              </p>
            </div>
          )}
        </div>
        
        <button 
          className={`flex items-center justify-center space-x-2 bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 w-full ${
            isDetecting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={handleDetectYubiKey}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Detecting YubiKey...</span>
            </>
          ) : keyDetected ? (
            <span>Refresh YubiKey Status</span>
          ) : (
            <span>Detect YubiKey</span>
          )}
        </button>
        
        <div className="mt-4 space-y-4">
          <h4 className="text-md font-medium text-white">Options</h4>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green"
              />
              <span className="text-gray-400">Auto-detect YubiKey on startup</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={useNFC}
                onChange={(e) => setUseNFC(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green"
              />
              <span className="text-gray-400">Use NFC for YubiKey detection</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={requireYubiKey}
                onChange={(e) => setRequireYubiKey(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green"
              />
              <span className="text-gray-400">Always require YubiKey for decryption</span>
            </label>
          </div>
        </div>
        
        <div className="mt-4 bg-secondary-dark p-4 rounded-lg">
          <h4 className="text-md font-medium text-white mb-3">YubiKey Information</h4>
          <p className="text-sm text-gray-400">
            Secure Mail Client uses YubiKey for storing PGP private keys and performing cryptographic operations. 
            This ensures your private keys never leave the secure hardware token.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            To set up YubiKey with PGP:
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-400 mt-1 space-y-1">
            <li>Insert your YubiKey into a USB port</li>
            <li>Click "Detect YubiKey" to establish connection</li>
            <li>Generate or import a PGP key in the Key Management section</li>
            <li>Your key operations will use the connected YubiKey</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;