import { Lock, Send, X, User, Key, Paperclip, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';

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
    <div className="h-full flex flex-col bg-[#030b1a] p-6 overflow-y-auto">
      {/* Email Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#0c1c3d]">
        <div className="flex items-center space-x-3">
          <Lock className="text-[#12d992]" size={20} style={{ filter: 'drop-shadow(0 0 4px rgba(18, 217, 146, 0.3))' }} />
          <span className="text-lg font-medium text-white" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>New Encrypted Message</span>
        </div>
        <button 
          onClick={onCancel}
          className="text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Email Form */}
      <div className="flex-1 grid grid-rows-[auto_auto_1fr] gap-4">
        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-2">
            {error}
          </div>
        )}

        {/* Top row with recipient field */}
        <div className="relative w-full">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#526583] z-10">
            <User size={18} />
          </div>
          <div className="flex w-full">
            <input
              type="text"
              placeholder="To:"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full bg-[#041024] pl-12 pr-4 py-4 rounded-l-lg border border-[#0c1c3d] focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 text-white placeholder-[#526583] text-sm"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' }}
            />
            {isSearchingRecipient && (
              <div className="bg-[#041024] px-4 flex items-center justify-center rounded-r-lg border-y border-r border-[#0c1c3d]">
                <Loader className="w-4 h-4 animate-spin text-[#12d992]" />
              </div>
            )}
            {encryptWithPGP && recipient && recipientKeys.length > 0 && (
              <div className="bg-[#041024] px-4 flex items-center justify-center rounded-r-lg border-y border-r border-[#0c1c3d]">
                <Lock className="w-4 h-4 text-[#12d992]" />
              </div>
            )}
          </div>
          {encryptWithPGP && recipient && recipientKeys.length > 0 && (
            <div className="mt-1 text-xs text-[#12d992]" style={{ textShadow: '0 0 5px rgba(18, 217, 146, 0.2)' }}>
              PGP key found for this recipient
            </div>
          )}
        </div>
        
        {/* Middle row with subject field */}
        <div className="w-full">
          <input
            type="text"
            placeholder="Subject:"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#041024] px-6 py-4 rounded-lg border border-[#0c1c3d] focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 text-white placeholder-[#526583] text-sm"
            style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' }}
          />
        </div>
        
        {/* Bottom row with message body */}
        <div className="w-full h-full min-h-[300px]">
          <textarea
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-full bg-[#041024] px-6 py-4 rounded-lg border border-[#0c1c3d] resize-none focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 text-white placeholder-[#526583] text-sm"
            style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' }}
          />
        </div>

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
      <div className="pt-6 mt-4 border-t border-[#0c1c3d] flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-[#c1d1f7]/80 cursor-pointer">
            <input
              type="checkbox"
              checked={encryptWithPGP}
              onChange={(e) => setEncryptWithPGP(e.target.checked)}
              className="form-checkbox rounded bg-[#041024] border-[#0c1c3d] text-[#12d992]"
            />
            <span className="flex items-center gap-1.5">
              <Key size={14} className="text-[#12d992]" />
              <span>Encrypt with PGP</span>
            </span>
          </label>
          
          <label className="text-[#c1d1f7]/70 hover:text-[#c1d1f7] cursor-pointer">
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
          className={`bg-gradient-to-r from-[#12d992] to-[#12d992]/90 text-[#030b1a] px-6 py-3 rounded-lg hover:from-[#12d992]/90 hover:to-[#12d992]/80 transition-all duration-200 text-sm font-bold flex items-center space-x-2 shadow-md ${
            (isLoading || !recipient || !subject) ? 'opacity-70 cursor-not-allowed' : 'shadow-[#12d992]/20'
          }`}
          style={{ textShadow: '0 1px 0 rgba(255, 255, 255, 0.1)' }}
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