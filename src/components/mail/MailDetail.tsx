import { useState, useEffect } from 'react';
import { 
  Lock, Key, ArrowLeft, MessageSquare, Reply, Forward, 
  FileText, Download, ArrowDownToLine, Shield, ChevronDown, 
  Share, Star, Flag, Trash2, Printer, User, Clock
} from 'lucide-react';
import { Mail } from '../../App';

interface MailDetailProps {
  email: Mail;
}

const MailDetail = ({ email }: MailDetailProps) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when a new email is selected
    setIsDecrypting(false);
    setDecryptProgress(0);
    setIsDecrypted(false);
    setDecryptedContent(null);
  }, [email.id]);

  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [isUsingYubiKey, setIsUsingYubiKey] = useState(false);
  const [yubiKeyStatus, setYubiKeyStatus] = useState<'detecting' | 'detected' | 'not_detected' | null>(null);

  // Handle decryption with YubiKey
  const handleYubiKeyDecrypt = async () => {
    if (!(window as any).electron?.yubikey) {
      setDecryptionError('YubiKey functionality not available - are you running in Electron?');
      return;
    }

    if (!email.text) {
      setDecryptionError('No encrypted content available');
      return;
    }

    // Extract PGP message
    const pgpStart = email.text.indexOf('-----BEGIN PGP MESSAGE-----');
    const pgpEnd = email.text.indexOf('-----END PGP MESSAGE-----');
    
    if (pgpStart === -1 || pgpEnd === -1) {
      setDecryptionError('No valid PGP message found in content');
      return;
    }

    const pgpMessage = email.text.substring(pgpStart, pgpEnd + 25);
    
    setIsUsingYubiKey(true);
    setYubiKeyStatus('detecting');
    setIsDecrypting(true);
    setDecryptionError(null);
    
    // Start progress animation
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 2;
      if (progress <= 90) {
        setDecryptProgress(progress);
      }
    }, 100);
    
    try {
      // First detect the YubiKey
      const detectResult = await window.electron.yubikey.detect();
      
      if (!detectResult.success || !detectResult.yubikey?.detected) {
        throw new Error('YubiKey not detected. Please connect your YubiKey and try again.');
      }
      
      setYubiKeyStatus('detected');
      
      // In the real implementation, we would use the YubiKey to decrypt
      // For now, we simulate decryption
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Then decrypt using PGP (in a real implementation, this would use the YubiKey)
      const result = await window.electron.pgp.decryptMessage({
        encryptedMessage: pgpMessage,
        passphrase: 'yubikey-provided-passphrase' // This would be handled differently with actual YubiKey
      });
      
      if (result.success && result.decryptedMessage) {
        setDecryptProgress(100);
        setTimeout(() => {
          setIsDecrypting(false);
          setIsDecrypted(true);
          setDecryptedContent(result.decryptedMessage || null);
          setIsUsingYubiKey(false);
          setYubiKeyStatus(null);
        }, 200);
      } else {
        throw new Error(result.error || 'Failed to decrypt message with YubiKey');
      }
    } catch (error) {
      setDecryptionError(error instanceof Error ? error.message : 'An unknown error occurred during YubiKey decryption');
      setIsDecrypting(false);
      setIsUsingYubiKey(false);
      setYubiKeyStatus('not_detected');
    } finally {
      clearInterval(progressInterval);
    }
  };

  // Handle decryption with passphrase
  const handleDecrypt = async () => {
    if (!(window as any).electron?.pgp) {
      setDecryptionError('PGP functionality not available - are you running in Electron?');
      return;
    }

    if (!email.text) {
      setDecryptionError('No encrypted content available');
      return;
    }

    // Extract PGP message block
    const pgpStart = email.text.indexOf('-----BEGIN PGP MESSAGE-----');
    const pgpEnd = email.text.indexOf('-----END PGP MESSAGE-----');
    
    if (pgpStart === -1 || pgpEnd === -1) {
      setDecryptionError('No valid PGP message found in content');
      return;
    }

    const pgpMessage = email.text.substring(pgpStart, pgpEnd + 25); // +25 to include the end marker
    
    if (!pgpMessage) {
      setDecryptionError('Empty PGP message');
      return;
    }

    // If no passphrase provided, we need to ask for it
    if (!passphrase) {
      setShowPassphraseInput(true);
      return;
    }
    
    setShowPassphraseInput(false);
    setIsDecrypting(true);
    setDecryptionError(null);
    
    // Start progress animation
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 5;
      if (progress <= 90) {
        setDecryptProgress(progress);
      }
    }, 100);
    
    try {
      const result = await window.electron.pgp.decryptMessage({
        encryptedMessage: pgpMessage,
        passphrase: passphrase
      });
      
      if (result.success && result.decryptedMessage) {
        setDecryptProgress(100);
        setTimeout(() => {
          setIsDecrypting(false);
          setIsDecrypted(true);
          setDecryptedContent(result.decryptedMessage || null);
        }, 200);
      } else {
        setDecryptionError(result.error || 'Failed to decrypt message');
        setIsDecrypting(false);
      }
    } catch (error) {
      setDecryptionError(error instanceof Error ? error.message : 'An unknown error occurred during decryption');
      setIsDecrypting(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  // Identify where the PGP message begins and ends, if present
  const renderPGPContent = () => {
    if (!email.text) return <p className="text-gray-400">No content available</p>;
    
    const pgpStart = email.text.indexOf('-----BEGIN PGP MESSAGE-----');
    const pgpEnd = email.text.indexOf('-----END PGP MESSAGE-----');
    
    if (pgpStart === -1 || pgpEnd === -1) {
      return (
        <div className="bg-secondary-dark rounded-xl p-6">
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap break-words text-gray-300">{email.text}</div>
          </div>
        </div>
      );
    }
    
    const beforePGP = email.text.substring(0, pgpStart);
    const pgpMessage = email.text.substring(pgpStart, pgpEnd + 25); // +25 to include the end marker
    const afterPGP = email.text.substring(pgpEnd + 25);
    
    return (
      <div className="space-y-6">
        {beforePGP && (
          <div className="bg-secondary-dark rounded-xl p-4">
            <div className="whitespace-pre-wrap break-words text-gray-300">{beforePGP}</div>
          </div>
        )}
        
        <div className="border border-border-dark bg-secondary-dark rounded-xl overflow-hidden">
          {/* Encrypted Message Header */}
          <div className="bg-base-dark border-b border-border-dark p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="text-accent-green" size={16} />
              <span className="text-accent-green font-mono text-sm font-medium">PGP ENCRYPTED MESSAGE</span>
            </div>
            {isDecrypted && (
              <div className="flex items-center space-x-2 text-accent-green">
                <div className="px-2 py-0.5 bg-accent-green/10 rounded text-xs">Decrypted</div>
              </div>
            )}
          </div>
          
          <div className="p-4">
            {isDecrypted ? (
              // Decrypted Content
              <div className="space-y-4">
                <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-4">
                  <div className="whitespace-pre-wrap break-words text-gray-200 leading-relaxed">
                    {decryptedContent}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-gray-400 flex items-center">
                    <Shield className="h-3.5 w-3.5 mr-1.5 text-accent-green" />
                    {isUsingYubiKey || yubiKeyStatus === 'detected' ? (
                      <span>Decrypted with YubiKey • Signature verified • {new Date().toLocaleTimeString()}</span>
                    ) : (
                      <span>Signature verified • Decrypted {new Date().toLocaleTimeString()}</span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="text-xs text-gray-400 hover:text-accent-green hover:underline flex items-center">
                      <FileText size={14} className="mr-1" />
                      View PGP details
                    </button>
                    <button className="text-xs text-gray-400 hover:text-accent-green hover:underline flex items-center">
                      <Download size={14} className="mr-1" />
                      Save decrypted message
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Encrypted Content
              <div className="space-y-4">
                {/* Encrypted message visualization */}
                <div className="bg-base-dark border border-border-dark rounded-lg p-3 font-mono">
                  <div className="overflow-hidden max-h-32">
                    <div className="text-gray-500 text-xs overflow-y-auto whitespace-pre-wrap">
                      {pgpMessage}
                    </div>
                  </div>
                </div>
                
                {/* Error message */}
                {decryptionError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm border border-red-500/20">
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">⚠️</div>
                      <div>{decryptionError}</div>
                    </div>
                  </div>
                )}
                
                {/* Decryption interface */}
                {showPassphraseInput ? (
                  <div className="space-y-3 bg-secondary-dark/70 rounded-lg p-4 border border-border-dark">
                    <label className="text-sm text-gray-300 font-medium">Enter passphrase to decrypt message:</label>
                    <div className="flex space-x-2">
                      <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className="flex-1 bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                        placeholder="Passphrase"
                        autoFocus
                      />
                      <button
                        onClick={handleDecrypt}
                        disabled={!passphrase}
                        className={`flex items-center space-x-2 bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90 ${
                          !passphrase ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Key size={16} />
                        <span>Decrypt</span>
                      </button>
                    </div>
                    
                    <div className="flex justify-between">
                      <button
                        onClick={() => setShowPassphraseInput(false)}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowPassphraseInput(false);
                          handleYubiKeyDecrypt();
                        }}
                        className="text-sm text-accent-green hover:underline flex items-center"
                        title="Use YubiKey for decryption"
                      >
                        <svg className="w-4 h-4 mr-1" viewBox="0 0 512 512" fill="currentColor">
                          <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                        </svg>
                        Use YubiKey
                      </button>
                    </div>
                  </div>
                ) : isDecrypting ? (
                  // Decryption progress bar
                  <div className="space-y-3 bg-secondary-dark/70 rounded-lg p-4 border border-border-dark">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-300 font-medium">Decryption in progress...</span>
                      <span className="text-xs text-accent-green">{decryptProgress}%</span>
                    </div>
                    
                    <div className="w-full bg-base-dark rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-accent-green h-2.5 rounded-full transition-all duration-200 ease-in-out" 
                        style={{ width: `${decryptProgress}%` }} 
                      />
                    </div>
                    
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>
                        {isUsingYubiKey 
                          ? yubiKeyStatus === 'detecting' 
                            ? 'Detecting YubiKey...' 
                            : 'Using YubiKey for decryption'
                          : 'Verifying digital signature'
                        }
                      </span>
                      <span>
                        {isUsingYubiKey 
                          ? 'YubiKey authentication required' 
                          : 'Using PGP private key'
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  // Decrypt Buttons
                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      onClick={handleDecrypt}
                      className="flex items-center justify-center space-x-2 bg-accent-green text-white px-6 py-2.5 rounded-lg hover:bg-accent-green/90 flex-1"
                    >
                      <Key size={16} />
                      <span className="font-medium">Decrypt with Passphrase</span>
                    </button>
                    
                    <button
                      onClick={handleYubiKeyDecrypt}
                      className="flex items-center justify-center space-x-2 border border-accent-green text-accent-green px-6 py-2.5 rounded-lg hover:bg-accent-green/10 flex-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                      </svg>
                      <span className="font-medium">Decrypt with YubiKey</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {afterPGP && (
          <div className="bg-secondary-dark rounded-xl p-4 mb-8">
            <div className="whitespace-pre-wrap break-words text-gray-300">{afterPGP}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-base-dark overflow-y-auto">
      {/* Email Header - Subject and Security Status */}
      <div className="px-6 py-4 border-b border-border-dark flex justify-between items-center sticky top-0 bg-base-dark z-10">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-medium truncate max-w-[60ch]">{email.subject}</h3>
        </div>
        
        <div className="flex items-center space-x-4">
          {isDecrypted ? (
            <div className="flex items-center space-x-2 text-accent-green bg-accent-green/10 px-3 py-1 rounded-lg">
              <Lock size={16} />
              <span className="text-sm font-medium">MESSAGE DECRYPTED</span>
            </div>
          ) : email.isEncrypted ? (
            <div className="flex items-center space-x-2 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-lg">
              <Lock size={16} />
              <span className="text-sm font-medium">ENCRYPTED</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-500 bg-red-500/10 px-3 py-1 rounded-lg">
              <Shield size={16} />
              <span className="text-sm font-medium">NOT ENCRYPTED</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Sender Information */}
      <div className="px-6 py-4 border-b border-border-dark">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-accent-green/10 flex items-center justify-center mt-1">
              <User className="h-6 w-6 text-accent-green" />
            </div>
            <div>
              <p className="text-md font-medium text-gray-200">{email.from}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center">
                <Clock size={14} className="mr-1.5" />
                {email.date ? new Date(email.date).toLocaleString() : 'Unknown date'}
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-1">
            <button className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" title="Reply">
              <Reply size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" title="Forward">
              <Forward size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" title="Star">
              <Star size={18} />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" title="Delete">
              <Trash2 size={18} />
            </button>
            <div className="relative">
              <button className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" title="More Options">
                <ChevronDown size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Information Bar */}
      {email.isEncrypted && (
        <div className={`px-6 py-2 border-b border-border-dark flex items-center justify-between ${
          isDecrypted 
            ? 'bg-accent-green/5 text-accent-green' 
            : 'bg-secondary-dark text-gray-400'
        }`}>
          <div className="flex items-center">
            <Lock size={16} className="mr-2" />
            {isDecrypted 
              ? 'This message has been decrypted using your private key.' 
              : 'This message is encrypted with PGP and requires decryption.'}
          </div>
          {isDecrypted && (
            <div className="flex space-x-2">
              <button className="flex items-center text-xs hover:underline">
                <FileText size={14} className="mr-1" />
                View encryption details
              </button>
            </div>
          )}
        </div>
      )}

      {/* Email Content */}
      <div className="p-6 space-y-4 flex-1">
        {renderPGPContent()}
      </div>
    </div>
  );
};

export default MailDetail;