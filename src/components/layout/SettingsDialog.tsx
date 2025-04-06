import React, { useState, useEffect } from 'react';
import { X, Mail, Key, Shield, Usb, Loader, CheckCircle, Lock } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import OAuthCodePrompt from '../mail/OAuthCodePrompt';

// Create a special wider dialog content component just for settings
const WideDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] max-w-[1200px] h-[75vh] translate-x-[-50%] translate-y-[-50%] gap-3 border border-border-dark bg-secondary-dark p-3 shadow-xl duration-200 rounded-lg"
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));

WideDialogContent.displayName = "WideDialogContent";

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
        <WideDialogContent className="border border-border-dark">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Settings
            </DialogTitle>
            <button
              onClick={onClose}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </DialogHeader>

          <div className="grid grid-cols-[150px_1fr] gap-3 h-full mt-1.5">
            <div className="border-r border-border-dark pr-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-[9px] md:text-xs rounded-l-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-accent-green/15 text-accent-green font-medium border-r-2 border-accent-green'
                        : 'text-gray-400 hover:bg-hover-dark hover:text-white'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${activeTab === tab.id ? 'text-accent-green' : 'text-gray-500'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-3 overflow-y-auto pr-4">
              {activeTab === 'email' && <EmailSettings />}
              {activeTab === 'keys' && <KeyManagement />}
              {activeTab === 'yubikey' && <YubiKeySettings />}
            </div>
          </div>
        </WideDialogContent>
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
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [authMethod, setAuthMethod] = useState<'basic' | 'oauth'>('basic');
  const [isOAuthAuthenticated, setIsOAuthAuthenticated] = useState(false);
  const [isCodePromptOpen, setIsCodePromptOpen] = useState(false);

  useEffect(() => {
    // Load saved credentials if available
    const loadSavedCredentials = async () => {
      if (!(window as any).electron?.credentials) {
        console.log('Credentials functionality not available - are you running in Electron?');
        return;
      }

      try {
        const result = await window.electron.credentials.getGmail();
        if (result.success && result.credentials) {
          setEmail(result.credentials.email || '');
          // We don't set the password here as it's a security risk
          setCredentialsSaved(!!result.credentials.email);
        }
      } catch (err) {
        console.error('Error loading credentials:', err);
      }
    };

    // Check OAuth status
    const checkOAuthStatus = async () => {
      // Use type assertion to safely access oauth property
      const electronAPI = (window as any).electron;
      if (!electronAPI?.oauth) {
        console.log('OAuth functionality not available - are you running in Electron?');
        return;
      }

      try {
        const result = await electronAPI.oauth.checkAuth();
        if (result.success) {
          setIsOAuthAuthenticated(result.isAuthenticated);
          if (result.isAuthenticated) {
            setAuthMethod('oauth');
            setStatus('connected');
            setStatusMessage('Connected via Google OAuth');
          }
        }
      } catch (err) {
        console.error('Error checking OAuth status:', err);
      }
    };

    loadSavedCredentials();
    checkOAuthStatus();

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
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    if (!(window as any).electron?.credentials) {
      setError('Credentials functionality only available in Electron environment');
      return;
    }

    if (!(window as any).electron?.imap) {
      setError('IMAP functionality only available in Electron environment');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setStatus('connecting');
      setStatusMessage('Saving credentials...');
      
      // First save credentials securely
      const credResult = await window.electron.credentials.saveGmail({
        email,
        password
      });
      
      if (!credResult.success) {
        throw new Error(credResult.error || 'Failed to save credentials');
      }
      
      setCredentialsSaved(true);
      setStatusMessage('Credentials saved, connecting to IMAP server...');
      
      // Then try to connect
      const connectResult = await window.electron.imap.connect({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993
      });
      
      if (!connectResult.success) {
        throw new Error(connectResult.error || 'Failed to connect to IMAP server');
      }

      // Fetch emails will be triggered automatically after connection
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  };

  // Function to handle OAuth authentication
  const handleOAuthAuthenticate = async () => {
    // Use type assertion to safely access oauth property
    const electronAPI = (window as any).electron;
    if (!electronAPI?.oauth) {
      setError('OAuth functionality not available - are you running in Electron?');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);
      setStatus('connecting');
      setStatusMessage('Initiating Google OAuth authentication...');
      
      // Set up listener for code prompt request
      const codePromptHandler = () => {
        setIsCodePromptOpen(true);
      };
      
      // Add listener for code prompt
      window.electron.ipcRenderer.on('oauth:code-prompt', codePromptHandler);
      
      // Start authentication process
      const result = await electronAPI.oauth.authenticate();
      
      // Remove prompt listener as it's no longer needed
      window.electron.ipcRenderer.on('oauth:code-prompt', () => {}); // Remove listener
      
      if (result.success) {
        setIsOAuthAuthenticated(true);
        setStatus('connected');
        setStatusMessage('Connected via Google OAuth');
        
        // Fetch emails after authentication
        const emailsResult = await electronAPI.oauth.fetchEmails();
        if (emailsResult.success) {
          console.log('OAuth emails fetched:', emailsResult.emails);
          electronAPI.imap.onEmailsFetched(emailsResult.emails);
        }
      } else {
        throw new Error(result.error || 'OAuth authentication failed');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred during OAuth authentication');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OAuth code submission
  const handleOAuthCodeSubmit = (code: string) => {
    if (code && window.electron?.oauth) {
      window.electron.oauth.submitAuthCode(code);
      setIsCodePromptOpen(false);
    }
  };

  // Function to handle OAuth logout
  const handleOAuthLogout = async () => {
    // Use type assertion to safely access oauth property
    const electronAPI = (window as any).electron;
    if (!electronAPI?.oauth) {
      setError('OAuth functionality not available - are you running in Electron?');
      return;
    }

    try {
      const result = await electronAPI.oauth.logout();
      
      if (result.success) {
        setIsOAuthAuthenticated(false);
        setStatus('disconnected');
        setStatusMessage('');
      } else {
        throw new Error(result.error || 'OAuth logout failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during OAuth logout');
    }
  };

  return (
    <div className="space-y-4">
      {/* OAuth Code Prompt */}
      <OAuthCodePrompt 
        isOpen={isCodePromptOpen}
        onClose={() => setIsCodePromptOpen(false)}
        onSubmit={handleOAuthCodeSubmit}
      />
      
      <h3 className="text-[11px] font-medium text-white">Gmail Configuration</h3>
      
      {status === 'error' && error && (
        <div className="bg-red-500/10 text-red-500 p-2 rounded-lg text-[9px]">
          {error}
        </div>
      )}
      
      {status === 'connecting' && (
        <div className="bg-yellow-500/10 text-yellow-500 p-2 rounded-lg flex items-center gap-1.5 text-[9px]">
          <Loader className="w-2.5 h-2.5 animate-spin" />
          <span>{statusMessage || 'Connecting to IMAP server...'}</span>
        </div>
      )}

      {status === 'connected' && (
        <div className="bg-green-500/10 text-green-500 p-2 rounded-lg flex items-center gap-1.5 text-[9px]">
          <CheckCircle className="w-2.5 h-2.5" />
          <span>{statusMessage || 'Connected successfully'}</span>
        </div>
      )}
      
      {credentialsSaved && status !== 'connected' && (
        <div className="bg-blue-500/10 text-blue-500 p-2 rounded-lg flex items-center gap-1.5 text-[9px]">
          <Lock className="w-2.5 h-2.5" />
          <span>Credentials saved securely</span>
        </div>
      )}

      {/* Authentication Method Tabs */}
      <div className="mb-3">
        <div className="flex bg-base-dark rounded-lg p-0.5 mb-2 border border-border-dark">
          <button
            onClick={() => setAuthMethod('basic')}
            className={`flex-1 px-2 py-1 rounded-md transition-all text-[9px] font-medium ${
              authMethod === 'basic'
                ? 'bg-accent-green text-white shadow-md'
                : 'text-gray-400 hover:bg-hover-dark hover:text-gray-300'
            }`}
          >
            Password Authentication
          </button>
          <button
            onClick={() => setAuthMethod('oauth')}
            className={`flex-1 px-2 py-1 rounded-md transition-all text-[9px] font-medium ${
              authMethod === 'oauth'
                ? 'bg-accent-green text-white shadow-md'
                : 'text-gray-400 hover:bg-hover-dark hover:text-gray-300'
            }`}
          >
            Google OAuth
          </button>
        </div>
      </div>

      {authMethod === 'basic' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-base-dark border border-border-dark rounded-lg pl-7 pr-3 py-2 text-white text-xs"
                  placeholder="your.email@gmail.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-300">App Password</label>
              <div className="relative">
                <Lock className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-base-dark border border-border-dark rounded-lg pl-7 pr-7 py-2 text-white text-xs"
                  placeholder="Gmail App Password"
                />
                {credentialsSaved && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-accent-green">
                    <CheckCircle size={12} />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-gray-500">
                  Use an App Password from Google Account
                </p>
                <a 
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-accent-green hover:underline"
                >
                  How to create?
                </a>
              </div>
            </div>
          </div>
          <div className="space-y-1 mt-1">
            <label className="text-xs font-medium text-gray-300">IMAP Settings</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] font-medium">
                  HOST
                </span>
                <input
                  type="text"
                  className="bg-base-dark/50 border border-border-dark rounded-lg px-3 py-2 pl-12 text-white text-xs"
                  placeholder="imap.gmail.com"
                  defaultValue="imap.gmail.com"
                  disabled
                />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 text-[10px] font-medium">
                  PORT
                </span>
                <input
                  type="number"
                  className="bg-base-dark/50 border border-border-dark rounded-lg px-3 py-2 pl-12 text-white text-xs"
                  placeholder="993"
                  defaultValue="993"
                  disabled
                />
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-4">
            <button 
              onClick={handleSave}
              disabled={isLoading || !email || !password}
              className={`flex-1 bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 transition-colors text-xs font-medium flex items-center justify-center gap-2
                ${(isLoading || !email || !password) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : status === 'connected' ? (
                'Reconnect'
              ) : (
                'Save & Connect'
              )}
            </button>
            
            {credentialsSaved && (
              <button 
                onClick={() => {
                  const electronAPI = (window as any).electron;
                  if (electronAPI?.credentials) {
                    electronAPI.credentials.clear();
                  }
                }}
                className="bg-red-500/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/30 transition-colors text-xs font-medium"
              >
                Clear Credentials
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary-dark p-4 rounded-lg border border-border-dark">
              <h4 className="text-xs font-medium text-white mb-3">OAuth2 Authentication</h4>
              <p className="text-[10px] text-gray-300 mb-3">
                Connect securely to Gmail using Google OAuth2. This method provides:
              </p>
              <ul className="list-disc list-inside text-[10px] text-gray-400 space-y-1 mb-4 ml-1">
                <li>No need to create an app password</li>
                <li>Enhanced security with token-based access</li>
                <li>Limited scope access to your account</li>
                <li>Ability to revoke access at any time</li>
              </ul>
              
              {isOAuthAuthenticated ? (
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const electronAPI = (window as any).electron;
                      if (electronAPI?.oauth) {
                        electronAPI.oauth.fetchEmails().then((result: any) => {
                          if (result.success) {
                            console.log('OAuth emails fetched:', result.emails);
                            electronAPI.imap.onEmailsFetched(result.emails);
                          }
                        });
                      }
                    }}
                    className="flex-1 bg-accent-green text-white px-3 py-2 rounded-lg hover:bg-accent-green/90 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Refresh Emails
                  </button>
                  <button
                    onClick={handleOAuthLogout}
                    className="bg-red-500/20 text-red-500 px-3 py-2 rounded-lg hover:bg-red-500/30 text-xs font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleOAuthAuthenticate}
                  disabled={isLoading}
                  className={`w-full bg-accent-green text-white px-3 py-2 rounded-lg hover:bg-accent-green/90 text-xs font-medium ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader className="w-3 h-3 animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.545,12.151L12.545,12.151c0,1.054,0.855,1.909,1.909,1.909h3.535c-0.228,1.814-1.098,3.42-2.373,4.645 c-1.604,1.604-3.82,2.295-6.004,2.295c-4.619,0-8.358-3.739-8.358-8.358c0-4.619,3.739-8.358,8.358-8.358 c2.183,0,4.398,0.691,6.004,2.295l2.725-2.725C16.334,1.64,13.67,0.5,10.859,0.5C4.943,0.5,0.151,5.293,0.151,11.209 s4.793,10.709,10.709,10.709c4.535,0,9.67-3.193,10.592-9.404c0.03-0.197,0.047-0.399,0.047-0.603l0.001-8.949h-8.954V11.209z"/>
                      </svg>
                      <span>Connect with Google</span>
                    </div>
                  )}
                </button>
              )}
            </div>
            
            <div className="bg-secondary-dark p-4 rounded-lg border border-border-dark">
              <h4 className="text-xs font-medium text-white mb-3">Connection Status</h4>
              
              {status === 'error' && error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg mb-3 flex items-start gap-2 text-[10px]">
                  <div className="mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span>{error}</span>
                </div>
              )}
              
              {status === 'connecting' && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-2 rounded-lg mb-3 flex items-center gap-2 text-[10px]">
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>{statusMessage || 'Connecting to OAuth service...'}</span>
                </div>
              )}
              
              {status === 'connected' && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-2 rounded-lg mb-3 flex items-center gap-2 text-[10px]">
                  <CheckCircle className="w-3 h-3" />
                  <span>{statusMessage || 'Connected successfully'}</span>
                </div>
              )}
              
              <div className="mt-3 bg-base-dark rounded-lg p-3 border border-border-dark">
                <h5 className="text-[10px] font-medium text-gray-300 mb-2">Configuration Guide</h5>
                <p className="text-[10px] text-gray-400 mb-2">
                  Set up OAuth in Google Cloud Console:
                </p>
                <ul className="list-decimal list-inside text-[10px] text-gray-400 space-y-1 ml-1">
                  <li>Create an <span className="text-accent-green">OAuth 2.0 Desktop</span> client</li>
                  <li>Use <span className="font-mono bg-base-dark/60 px-1 py-0.5 rounded text-[9px] text-gray-300">urn:ietf:wg:oauth:2.0:oob</span></li>
                  <li>Enable <span className="text-accent-green">Gmail API</span> in your project</li>
                  <li>Copy credentials to <span className="font-mono bg-base-dark/60 px-1 py-0.5 rounded text-[9px] text-gray-300">.env</span> file</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
        
      <div className="mt-4 bg-secondary-dark p-3 rounded-lg border border-border-dark/50">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-3 h-3 text-accent-green" />
          <h4 className="text-xs font-medium text-white">Security Information</h4>
        </div>
        <p className="text-[10px] leading-relaxed text-gray-400">
          Your credentials are encrypted locally using modern cryptography. When a YubiKey is connected,
          it provides an additional layer of security by deriving the encryption key from the hardware token.
          OAuth authentication is even more secure as it doesn't store your password.
        </p>
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
    <div className="space-y-4">
      <h3 className="text-[11px] font-medium text-white">PGP Key Management</h3>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/10 text-green-500 p-3 rounded-lg text-xs">
          {success}
        </div>
      )}

      {showGenerateKey ? (
        <div className="space-y-3 bg-secondary-dark p-3 rounded-lg">
          <h4 className="text-xs font-medium text-white">Generate New PGP Key Pair</h4>
          
          <div className="space-y-2 mt-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Full Name</label>
              <input
                type="text"
                value={newKeyData.name}
                onChange={(e) => setNewKeyData({...newKeyData, name: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-3 py-1.5 text-white text-xs"
                placeholder="Your Full Name"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Email Address</label>
              <input
                type="email"
                value={newKeyData.email}
                onChange={(e) => setNewKeyData({...newKeyData, email: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-3 py-1.5 text-white text-xs"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Passphrase</label>
              <input
                type="password"
                value={newKeyData.passphrase}
                onChange={(e) => setNewKeyData({...newKeyData, passphrase: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-3 py-1.5 text-white text-xs"
                placeholder="Strong passphrase for your key"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Confirm Passphrase</label>
              <input
                type="password"
                value={newKeyData.confirmPassphrase}
                onChange={(e) => setNewKeyData({...newKeyData, confirmPassphrase: e.target.value})}
                className="w-full bg-base-dark border border-border-dark rounded-lg px-3 py-1.5 text-white text-xs"
                placeholder="Confirm passphrase"
              />
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleGenerateKey}
              disabled={isLoading}
              className={`bg-accent-green text-white px-3 py-1.5 rounded-lg hover:bg-accent-green/90 flex-1 text-xs ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-3 h-3 animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate Key Pair'
              )}
            </button>
            
            <button
              onClick={() => setShowGenerateKey(false)}
              className="bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex space-x-2">
          <button
            onClick={() => setShowGenerateKey(true)}
            className="bg-accent-green text-white px-3 py-1.5 rounded-lg hover:bg-accent-green/90 text-xs"
          >
            Generate New Key Pair
          </button>
        </div>
      )}
      
      <div className="space-y-2 mt-2">
        <h4 className="text-[10px] font-medium text-white">Import Existing Public Key</h4>
        <div className="space-y-1.5">
          <textarea
            value={publicKeyInput}
            onChange={(e) => setPublicKeyInput(e.target.value)}
            className="w-full h-16 bg-base-dark border border-border-dark rounded-lg px-2 py-1.5 text-white font-mono text-[9px]"
            placeholder="Paste PGP public key here..."
          />
        </div>
        <button 
          onClick={handleImportKey}
          disabled={isLoading || !publicKeyInput.trim()}
          className={`bg-accent-green text-white px-2 py-1 rounded-lg hover:bg-accent-green/90 text-[9px] ${
            (isLoading || !publicKeyInput.trim()) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-1.5">
              <Loader className="w-2.5 h-2.5 animate-spin" />
              <span>Importing...</span>
            </div>
          ) : (
            'Import Key'
          )}
        </button>
      </div>
      
      <div className="mt-3">
        <h4 className="text-[10px] font-medium text-white mb-1.5">Stored Keys</h4>
        
        {isLoading && keys.length === 0 ? (
          <div className="flex justify-center py-2">
            <Loader className="w-3 h-3 animate-spin text-accent-green" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-2 text-gray-500 text-[9px]">
            No PGP keys found
          </div>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {keys.map((key) => (
              <div key={key.fingerprint} className="bg-base-dark border border-border-dark rounded-lg p-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <p className="text-white text-[9px]">{key.email}</p>
                      {key.isDefault && (
                        <span className="bg-accent-green/20 text-accent-green px-1 py-0.5 rounded text-[8px]">
                          Default
                        </span>
                      )}
                      {key.hasPrivateKey && (
                        <span className="bg-gray-700 text-gray-300 px-1 py-0.5 rounded text-[8px]">
                          Private Key
                        </span>
                      )}
                    </div>
                    {key.name && <p className="text-[8px] text-gray-400">{key.name}</p>}
                    <p className="text-[7px] text-gray-500 font-mono mt-0.5">
                      {key.fingerprint}
                    </p>
                  </div>
                  <div className="flex space-x-1.5">
                    {!key.isDefault && key.hasPrivateKey && (
                      <button 
                        onClick={() => handleSetDefaultKey(key.fingerprint)}
                        className="text-accent-green hover:text-accent-green/80"
                        title="Set as default key"
                      >
                        <CheckCircle className="w-2.5 h-2.5" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteKey(key.fingerprint)}
                      className="text-red-500 hover:text-red-400"
                      title="Delete key"
                    >
                      <X className="w-2.5 h-2.5" />
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
    <div className="space-y-4">
      <h3 className="text-[11px] font-medium text-white">YubiKey Configuration</h3>
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-xs">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div className={`p-4 border rounded-lg ${
          keyDetected 
            ? 'bg-accent-green/10 border-accent-green/30' 
            : 'bg-base-dark border-border-dark'
        }`}>
          {keyDetected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-accent-green font-medium text-xs">YubiKey Detected</h4>
                <div className="bg-accent-green/20 text-accent-green px-2 py-0.5 rounded text-[10px]">
                  Connected
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                <span className="text-gray-400">Serial Number:</span>
                <span className="text-white font-mono text-right">{keyInfo?.serial}</span>
                <span className="text-gray-400">Firmware Version:</span>
                <span className="text-white font-mono text-right">{keyInfo?.version}</span>
                <span className="text-gray-400">PGP Key ID:</span>
                <span className="text-white font-mono text-right">{keyInfo?.pgpKeyId}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-3">
              <p className="text-gray-400 text-xs">No YubiKey detected</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Connect your YubiKey to the USB port or NFC pad
              </p>
            </div>
          )}
        </div>
        
        <button 
          className={`flex items-center justify-center space-x-2 bg-accent-green text-white px-3 py-2 rounded-lg hover:bg-accent-green/90 w-full text-xs ${
            isDetecting ? 'opacity-70 cursor-not-allowed' : ''
          }`}
          onClick={handleDetectYubiKey}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <>
              <Loader className="w-3 h-3 animate-spin" />
              <span>Detecting YubiKey...</span>
            </>
          ) : keyDetected ? (
            <span>Refresh YubiKey Status</span>
          ) : (
            <span>Detect YubiKey</span>
          )}
        </button>
        
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-medium text-white">Options</h4>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={autoDetect}
                onChange={(e) => setAutoDetect(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green h-3 w-3"
              />
              <span className="text-gray-400 text-xs">Auto-detect YubiKey on startup</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={useNFC}
                onChange={(e) => setUseNFC(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green h-3 w-3"
              />
              <span className="text-gray-400 text-xs">Use NFC for YubiKey detection</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={requireYubiKey}
                onChange={(e) => setRequireYubiKey(e.target.checked)}
                className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green h-3 w-3"
              />
              <span className="text-gray-400 text-xs">Always require YubiKey for decryption</span>
            </label>
          </div>
        </div>
        
        <div className="mt-4 bg-secondary-dark p-3 rounded-lg">
          <h4 className="text-xs font-medium text-white mb-2">YubiKey Information</h4>
          <p className="text-[10px] text-gray-400">
            Secure Mail Client uses YubiKey for storing PGP private keys and performing cryptographic operations. 
            This ensures your private keys never leave the secure hardware token.
          </p>
          <p className="text-[10px] text-gray-400 mt-2">
            To set up YubiKey with PGP:
          </p>
          <ol className="list-decimal list-inside text-[10px] text-gray-400 mt-1 space-y-1 ml-1">
            <li>Insert your YubiKey into a USB port</li>
            <li>Click "Detect YubiKey" to establish connection</li>
            <li>Generate or import a PGP key in Key Management</li>
            <li>Your key operations will use the connected YubiKey</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;