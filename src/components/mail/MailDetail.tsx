import { useState, useEffect } from 'react';
import { Lock, Key, ArrowLeft } from 'lucide-react';
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
          setDecryptedContent(result.decryptedMessage);
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
      return <pre className="text-gray-300 whitespace-pre-wrap">{email.text}</pre>;
    }
    
    const beforePGP = email.text.substring(0, pgpStart);
    const pgpMessage = email.text.substring(pgpStart, pgpEnd + 25); // +25 to include the end marker
    const afterPGP = email.text.substring(pgpEnd + 25);
    
    return (
      <div className="space-y-4">
        {beforePGP && <pre className="text-gray-300 whitespace-pre-wrap">{beforePGP}</pre>}
        
        <div className="border border-border-dark bg-secondary-dark rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Lock className="text-accent-green" size={16} />
            <span className="text-accent-green font-mono text-sm">PGP ENCRYPTED MESSAGE</span>
          </div>
          
          {isDecrypted ? (
            <pre className="text-gray-300 whitespace-pre-wrap">{decryptedContent}</pre>
          ) : (
            <>
              <pre className="text-gray-500 whitespace-pre-wrap font-mono text-xs">{pgpMessage}</pre>
              
              {decryptionError && (
                <div className="mt-4 p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
                  {decryptionError}
                </div>
              )}
              
              {showPassphraseInput ? (
                <div className="mt-4 space-y-3">
                  <label className="text-sm text-gray-400">Enter passphrase to decrypt message:</label>
                  <div className="flex space-x-2">
                    <input
                      type="password"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="flex-1 bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
                      placeholder="Passphrase"
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
                      className="text-sm text-accent-green hover:underline"
                      title="Use YubiKey for decryption"
                    >
                      Use YubiKey
                    </button>
                  </div>
                </div>
              ) : isDecrypting ? (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div 
                      className="bg-accent-green h-2 rounded-full transition-all duration-200 ease-in-out" 
                      style={{ width: `${decryptProgress}%` }} 
                    />
                  </div>
                  <p className="text-xs text-gray-400">Decrypting message... {decryptProgress}%</p>
                </div>
              ) : (
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    onClick={handleDecrypt}
                    className="flex items-center space-x-2 bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90"
                  >
                    <Key size={16} />
                    <span>Decrypt Message</span>
                  </button>
                  
                  <button
                    title="Use YubiKey for decryption"
                    className="border border-accent-green text-accent-green px-4 py-2 rounded-lg hover:bg-accent-green/10"
                  >
                    Use YubiKey
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {afterPGP && <pre className="text-gray-300 whitespace-pre-wrap">{afterPGP}</pre>}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-base-dark p-6 overflow-y-auto">
      {/* Email Header */}
      <div className="pb-6 border-b border-border-dark space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-medium">{email.subject}</h3>
          {isDecrypted && (
            <div className="flex items-center space-x-2 text-accent-green">
              <Lock size={18} />
              <span className="text-sm">MESSAGE DECRYPTED</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-accent-green" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 font-mono">{email.from}</p>
            <p className="text-xs text-gray-500">
              {email.date ? new Date(email.date).toLocaleString() : 'Unknown date'}
            </p>
          </div>
        </div>
      </div>

      {/* Email Content */}
      <div className="pt-6 space-y-4 flex-1">
        {renderPGPContent()}
      </div>
    </div>
  );
};

export default MailDetail;