import { Lock, Send, X, User, Key, Paperclip } from 'lucide-react';
import { useState } from 'react';

interface ComposeEmailProps {
  onCancel?: () => void;
}

const ComposeEmail = ({ onCancel }: ComposeEmailProps) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [encryptWithPGP, setEncryptWithPGP] = useState(true);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const [recipientKeys, setRecipientKeys] = useState<Array<{
    fingerprint: string;
    email: string;
    name?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);

  // Load recipient keys when the recipient changes
  useEffect(() => {
    if (!recipient || !encryptWithPGP) return;
    
    const searchForRecipientKey = async () => {
      if (!(window as any).electron?.pgp) {
        setError('PGP functionality not available');
        return;
      }
      
      try {
        setIsSearchingRecipient(true);
        const result = await window.electron.pgp.getPublicKeys();
        
        if (result.success && result.keys) {
          // Find keys matching the recipient email
          const matchingKeys = result.keys.filter(
            key => key.email.toLowerCase() === recipient.toLowerCase()
          );
          
          setRecipientKeys(matchingKeys);
          
          if (matchingKeys.length === 0) {
            setError('No PGP key found for recipient. Message cannot be encrypted.');
          } else {
            setError(null);
          }
        }
      } catch (err) {
        console.error('Error searching for recipient key:', err);
      } finally {
        setIsSearchingRecipient(false);
      }
    };
    
    // Debounce the search to avoid too many requests
    const timerId = setTimeout(searchForRecipientKey, 500);
    return () => clearTimeout(timerId);
  }, [recipient, encryptWithPGP]);

  const handleSend = async () => {
    if (!recipient || !subject) {
      setError('Recipient and subject are required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let finalMessage = message;
      
      // If encryption is enabled and we have recipient keys
      if (encryptWithPGP && recipientKeys.length > 0) {
        if (!(window as any).electron?.pgp) {
          throw new Error('PGP functionality not available');
        }
        
        const result = await window.electron.pgp.encryptMessage({
          message,
          recipientFingerprints: recipientKeys.map(key => key.fingerprint)
        });
        
        if (!result.success || !result.encryptedMessage) {
          throw new Error(result.error || 'Failed to encrypt message');
        }
        
        finalMessage = result.encryptedMessage;
      }
      
      // In a real implementation, this would send the email via SMTP
      console.log('Sending message:', { 
        recipient, 
        subject, 
        message: finalMessage, 
        isEncrypted: encryptWithPGP && recipientKeys.length > 0,
        attachments 
      });
      
      // Success, close the compose window
      onCancel?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-base-dark p-6 overflow-y-auto">
      {/* Email Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-dark">
        <div className="flex items-center space-x-3">
          <Lock className="text-accent-green" size={20} />
          <span className="text-lg font-medium">New Encrypted Message</span>
        </div>
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Email Form */}
      <div className="flex-1 space-y-5">
        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="relative">
          <div className="absolute left-4 top-4 text-gray-400">
            <User size={18} />
          </div>
          <div className="flex">
            <input
              type="text"
              placeholder="To:"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-secondary-dark pl-12 pr-4 py-4 rounded-l-xl focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
            />
            {isSearchingRecipient && (
              <div className="bg-secondary-dark px-4 py-2 flex items-center rounded-r-xl border-l border-border-dark">
                <Loader className="w-4 h-4 animate-spin text-accent-green" />
              </div>
            )}
            {encryptWithPGP && recipient && recipientKeys.length > 0 && (
              <div className="bg-secondary-dark px-4 py-2 flex items-center rounded-r-xl border-l border-border-dark">
                <Lock className="w-4 h-4 text-accent-green" />
              </div>
            )}
          </div>
          {encryptWithPGP && recipient && recipientKeys.length > 0 && (
            <div className="mt-1 text-xs text-accent-green">
              PGP key found for this recipient
            </div>
          )}
        </div>
        
        <input
          type="text"
          placeholder="Subject:"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-secondary-dark px-6 py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
        />
        
        <textarea
          placeholder="Write your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full h-72 bg-secondary-dark px-6 py-4 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Attachments:</p>
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-secondary-dark rounded-lg py-2 px-4">
                  <span className="text-sm text-gray-300">{file.name}</span>
                  <button 
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-gray-500 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Footer */}
      <div className="pt-6 mt-4 border-t border-border-dark flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={encryptWithPGP}
              onChange={(e) => setEncryptWithPGP(e.target.checked)}
              className="form-checkbox rounded bg-secondary-dark border-border-dark text-accent-green"
            />
            <span className="flex items-center gap-1">
              <Key size={14} />
              <span>Encrypt with PGP</span>
            </span>
          </label>
          
          <label className="text-gray-400 hover:text-gray-300 cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleAddAttachment}
              className="hidden"
            />
            <Paperclip size={18} />
          </label>
        </div>
        
        <button 
          onClick={handleSend}
          disabled={isLoading || !recipient || !subject}
          className={`bg-accent-green text-white px-6 py-3 rounded-lg hover:bg-accent-green/90 transition-colors text-sm font-medium flex items-center space-x-2 ${
            (isLoading || !recipient || !subject) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <Loader size={16} className="animate-spin" />
              <span>{encryptWithPGP ? 'Encrypting & Sending...' : 'Sending...'}</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>{encryptWithPGP ? 'Send Encrypted' : 'Send'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComposeEmail;