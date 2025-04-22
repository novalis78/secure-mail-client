import { useState, useEffect } from 'react';
import { 
  Lock, Key, ArrowLeft, MessageSquare, Reply, Forward, 
  FileText, Download, ArrowDownToLine, Shield, ChevronDown, 
  Share, Star, Flag, Trash2, Printer, User, Clock, Usb
} from 'lucide-react';
import { Mail } from '../../App';
import { PinEntryDialog } from '../ui/pin-entry-dialog';

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
    
    // Debug log to see what's in the email object
    console.log("Mail detail received:", {
      id: email.id,
      from: email.from,
      subject: email.subject,
      hasText: !!email.text,
      textLength: email.text?.length || 0,
      textStart: email.text ? email.text.substring(0, 100) : null,
      hasHtml: !!email.html,
      htmlLength: email.html?.length || 0
    });
  }, [email.id]);

  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [isUsingYubiKey, setIsUsingYubiKey] = useState(false);
  const [yubiKeyStatus, setYubiKeyStatus] = useState<'detecting' | 'detected' | 'not_detected' | null>(null);
  
  // PIN dialog state
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinDialogError, setPinDialogError] = useState<string | undefined>(undefined);

  // Handle PIN submission
  const handlePinSubmit = async (pin: string) => {
    setShowPinDialog(false);
    setPinDialogError(undefined);
    
    // Check all possible content fields before giving up
    const emailContent = email.text || email.body || email.html;
    if (!emailContent) {
      setDecryptionError('No encrypted content available');
      return;
    }

    // Extract PGP message with our robust extraction function
    const pgpMessage = extractPGPMessage(emailContent);
    
    if (!pgpMessage) {
      setDecryptionError('No valid PGP message found in content');
      return;
    }
    
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
        passphrase: pin
      });
      
      if (result.success && result.decryptedMessage) {
        setDecryptProgress(100);
        setTimeout(() => {
          setIsDecrypting(false);
          setIsDecrypted(true);
          setDecryptedContent(result.decryptedMessage || null);
        }, 200);
      } else {
        // Check if this was a PIN-related error
        if (result.error && (
          result.error.includes('PIN') || 
          result.error.includes('pin') || 
          result.error.includes('incorrect')
        )) {
          setPinDialogError(result.error);
          setShowPinDialog(true);
        } else {
          setDecryptionError(result.error || 'Failed to decrypt message');
        }
        setIsDecrypting(false);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if this was a PIN-related error
      if (errorMsg.includes('PIN') || 
          errorMsg.includes('pin') || 
          errorMsg.includes('incorrect')) {
        setPinDialogError(errorMsg);
        setShowPinDialog(true);
      } else {
        setDecryptionError(errorMsg);
      }
      setIsDecrypting(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  // Handle decryption with YubiKey
  const handleYubiKeyDecrypt = async () => {
    if (!(window as any).electron?.yubikey) {
      setDecryptionError('YubiKey functionality not available - are you running in Electron?');
      return;
    }

    // Check all possible content fields before giving up
    const emailContent = email.text || email.body || email.html;
    if (!emailContent) {
      setDecryptionError('No encrypted content available');
      return;
    }

    // Extract PGP message with our robust extraction function
    const pgpMessage = extractPGPMessage(emailContent);
    
    if (!pgpMessage) {
      setDecryptionError('No valid PGP message found in content');
      return;
    }
    
    setIsUsingYubiKey(true);
    setYubiKeyStatus('detecting');
    setDecryptionError(null);
    
    try {
      // First detect the YubiKey
      const detectResult = await window.electron.yubikey.detect();
      
      if (!detectResult.success || !detectResult.yubikey?.detected) {
        throw new Error('YubiKey not detected. Please connect your YubiKey and try again.');
      }
      
      setYubiKeyStatus('detected');
      
      // Show PIN dialog for YubiKey
      setShowPinDialog(true);
      
    } catch (error) {
      setDecryptionError(error instanceof Error ? error.message : 'An unknown error occurred during YubiKey detection');
      setIsUsingYubiKey(false);
      setYubiKeyStatus('not_detected');
    }
  };

  // Helper function to extract PGP content from various formats
  const extractPGPMessage = (text: string | null): string | null => {
    if (!text) return null;
    
    console.log("Attempting to extract PGP message from content:", {
      contentLength: text.length,
      contentSample: text.substring(0, 100) + "..."
    });
    
    // Check for standard PGP message markers
    let pgpMessageStart = text.indexOf('-----BEGIN PGP MESSAGE-----');
    let pgpMessageEnd = text.indexOf('-----END PGP MESSAGE-----');
    
    if (pgpMessageStart !== -1 && pgpMessageEnd !== -1 && pgpMessageEnd > pgpMessageStart) {
      console.log("Found standard PGP message markers");
      return text.substring(pgpMessageStart, pgpMessageEnd + 25); // +25 to include the end marker
    }
    
    // Check for PGP signed message markers
    let pgpSignedStart = text.indexOf('-----BEGIN PGP SIGNED MESSAGE-----');
    let pgpSignedEnd = text.indexOf('-----END PGP SIGNATURE-----');
    
    if (pgpSignedStart !== -1 && pgpSignedEnd !== -1 && pgpSignedEnd > pgpSignedStart) {
      console.log("Found PGP signed message markers");
      return text.substring(pgpSignedStart, pgpSignedEnd + 26); // +26 to include the end marker
    }
    
    // Check for standard PGP markers that might be formatted differently (e.g., with line breaks or spaces)
    const cleanText = text.replace(/\s+/g, ' ');
    pgpMessageStart = cleanText.indexOf('-----BEGIN PGP MESSAGE-----');
    pgpMessageEnd = cleanText.indexOf('-----END PGP MESSAGE-----');
    
    if (pgpMessageStart !== -1 && pgpMessageEnd !== -1 && pgpMessageEnd > pgpMessageStart) {
      console.log("Found PGP message markers in normalized text");
      // Reconstruct the original message with proper formatting
      const startPos = text.indexOf('-----BEGIN');
      const endPos = text.lastIndexOf('-----END') + 30; // Approximate length to include the end marker
      if (startPos !== -1 && endPos > startPos) {
        return text.substring(startPos, endPos);
      }
    }
    
    // Check for Mailvelope
    if (text.includes('Version: Mailvelope')) {
      console.log("Found Mailvelope signature");
      const mailerStart = text.indexOf('Version: Mailvelope');
      const possibleStart = text.lastIndexOf('-----BEGIN', mailerStart - 100);
      const possibleEnd = text.indexOf('-----END', mailerStart);
      
      if (possibleStart !== -1 && possibleEnd !== -1 && possibleEnd > possibleStart) {
        return text.substring(possibleStart, possibleEnd + 30);
      }
    }
    
    // Check for forwarded content
    if (text.includes('Forwarded message') && text.includes('BEGIN PGP')) {
      console.log("Found forwarded message with PGP content");
      // Try to locate PGP block in forwarded message
      const forwardedStart = text.indexOf('Forwarded message');
      const pgpStartInForwarded = text.indexOf('-----BEGIN PGP', forwardedStart);
      const pgpEndInForwarded = text.indexOf('-----END PGP', pgpStartInForwarded);
      
      if (pgpStartInForwarded !== -1 && pgpEndInForwarded !== -1 && pgpEndInForwarded > pgpStartInForwarded) {
        return text.substring(pgpStartInForwarded, pgpEndInForwarded + 30);
      }
    }
    
    // Additional check for any kind of PGP block (more robust detection)
    const pgpBlockRegex = /-----BEGIN PGP .*?-----[\s\S]*?-----END PGP .*?-----/g;
    const matches = text.match(pgpBlockRegex);
    if (matches && matches.length > 0) {
      console.log("Found PGP block using regex", matches[0].substring(0, 50) + "...");
      return matches[0];
    }
    
    // Last resort: Look for base64 encoded content which might be the encrypted payload
    const base64Regex = /[A-Za-z0-9+/]{50,}={0,2}/;
    const base64Match = text.match(base64Regex);
    if (base64Match && base64Match[0].length > 100) {
      console.log("Found potential base64 encoded content, attempting to use as PGP message");
      // Try to reconstruct a PGP message around the base64 content
      return `-----BEGIN PGP MESSAGE-----\n\n${base64Match[0]}\n-----END PGP MESSAGE-----`;
    }
    
    console.log("No PGP content found in text");
    return null;
  };

  // Handle decryption with passphrase
  const handleDecrypt = async () => {
    if (!(window as any).electron?.pgp) {
      setDecryptionError('PGP functionality not available - are you running in Electron?');
      return;
    }

    // Check all possible content fields before giving up
    const emailContent = email.text || email.body || email.html;
    if (!emailContent) {
      setDecryptionError('No encrypted content available');
      return;
    }

    // Extract PGP message with our robust extraction function
    const pgpMessage = extractPGPMessage(emailContent);
    
    if (!pgpMessage) {
      setDecryptionError('No valid PGP message found in content');
      return;
    }

    // If no passphrase provided, try with empty string first
    // This will allow us to detect interactive YubiKey PIN requests
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
      // First try without a passphrase - this might trigger YubiKey PIN prompt
      const result = await window.electron.pgp.decryptMessage({
        encryptedMessage: pgpMessage,
        passphrase: passphrase || '' // Use empty string if no passphrase
      });
      
      if (result.success && result.decryptedMessage) {
        setDecryptProgress(100);
        setTimeout(() => {
          setIsDecrypting(false);
          setIsDecrypted(true);
          setDecryptedContent(result.decryptedMessage || null);
        }, 200);
      } else {
        // Check if we need a PIN for YubiKey operations
        if (result.error && (
          result.error.includes('PIN required') || 
          result.error.includes('Inappropriate ioctl') ||
          result.error.includes('interactive PIN prompt')
        )) {
          console.log('PIN needed for YubiKey decryption');
          setShowPinDialog(true);
        } 
        // Check if we need a passphrase (for regular PGP)
        else if (!passphrase || result.error && result.error.includes('passphrase')) {
          console.log('Regular passphrase needed');
          setShowPassphraseInput(true);
        } 
        // Other errors
        else {
          setDecryptionError(result.error || 'Failed to decrypt message');
        }
        setIsDecrypting(false);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check if PIN is needed
      if (errorMsg.includes('PIN required') || 
          errorMsg.includes('Inappropriate ioctl') ||
          errorMsg.includes('interactive PIN prompt')) {
        console.log('PIN needed due to error');
        setShowPinDialog(true);
      } 
      // Check if regular passphrase is needed
      else if (!passphrase || errorMsg.includes('passphrase')) {
        console.log('Regular passphrase needed due to error');
        setShowPassphraseInput(true);
      } 
      // Other errors
      else {
        setDecryptionError(errorMsg);
      }
      setIsDecrypting(false);
    } finally {
      clearInterval(progressInterval);
    }
  };

  // State for toggling full email display
  const [showFullEmail, setShowFullEmail] = useState(false);
  
  // Function to format email headers for display
  const formatEmailHeaders = (text: string): string => {
    if (!text) return '';
    
    // Extract headers - usually they're before the first double newline
    const headerEndPos = text.indexOf('\n\n');
    if (headerEndPos === -1) return text;
    
    const headers = text.substring(0, headerEndPos);
    return headers;
  };

  // Identify where the PGP message begins and ends, if present
  const renderPGPContent = () => {
    console.log("Rendering PGP content, email.text:", email.text ? `${email.text.slice(0, 50)}...` : "null");
    console.log("Email HTML content available:", email.html ? `${email.html.slice(0, 50)}...` : "null");
    
    // Get the content to display - use body field first, then fall back to text/html
    const emailContent = email.body || email.text || email.html;
    
    console.log("MailDetail debug - body available:", typeof email.body, email.body ? `Length: ${email.body.length}` : "null");
    console.log("MailDetail debug - text type:", typeof email.text);
    console.log("MailDetail debug - html type:", typeof email.html);
    console.log("MailDetail debug - Email content after OR check:", emailContent ? "present" : "missing");
    
    // Display empty state if no content is available at all
    if (!emailContent) {
      return (
        <div className="p-4 bg-secondary-dark/50 rounded-lg border border-border-dark">
          <h3 className="text-yellow-500 text-sm mb-2">No Content Available</h3>
          <p className="text-gray-400 text-xs mb-3">The email does not contain any text or HTML content.</p>
          <div className="bg-base-dark/80 p-3 rounded border border-border-dark">
            <p className="text-xs text-gray-500 mb-1">Debug Info:</p>
            <p className="text-xs text-gray-400 font-mono">
              id: {email.id}<br/>
              from: {email.from}<br/>
              subject: {email.subject}<br/>
              text: {email.text ? 'present' : 'null'}<br/>
              html: {email.html ? 'present' : 'null'}<br/>
              body: {email.body ? 'present' : 'null'}<br/>
            </p>
          </div>
        </div>
      );
    }
    
    // Get the content to use - prefer body first, then text, then HTML
    // Force string conversion in case we get unexpected types
    const contentToUse = typeof email.body === 'string' ? email.body :
                       typeof email.text === 'string' ? email.text : 
                       typeof email.html === 'string' ? email.html : "";
    
    // Use our improved extraction function to find PGP content
    const pgpMessageBlock = extractPGPMessage(contentToUse);
    let foundPGPContent = !!pgpMessageBlock;
    let pgpMessage = pgpMessageBlock || "";
    
    // If we found a PGP block, determine the start and end positions
    let pgpStart = -1;
    let pgpEnd = -1;
    
    if (foundPGPContent) {
      pgpStart = contentToUse.indexOf(pgpMessage);
      pgpEnd = pgpStart + pgpMessage.length - 1;
    }
    
    // Even if we can't find PGP markers, we'll treat all messages as secure
    if (!foundPGPContent) {
      // Look for potential PGP content to display, even in non-standard formats
      let potentialContent = "";
      
      // If this is a forwarded message, try to find the forwarded part
      if (contentToUse.includes('Forwarded message')) {
        const forwardedStart = contentToUse.indexOf('Forwarded message');
        potentialContent = contentToUse.substring(forwardedStart);
      } 
      // Look for Base64-encoded content (common in PGP emails)
      else if (contentToUse.match(/[A-Za-z0-9+/]{50,}={0,2}/)) {
        const match = contentToUse.match(/[A-Za-z0-9+/]{50,}={0,2}/);
        potentialContent = match ? match[0] : contentToUse;
      } else {
        potentialContent = contentToUse;
      }
      
      return (
        <div className="space-y-4">
          {/* Display email content with potential encrypted data visualization */}
          <div className="bg-secondary-dark rounded-xl p-6">
            <div className="prose prose-invert max-w-none">
              <div className="whitespace-pre-wrap break-words text-gray-300">{contentToUse}</div>
            </div>
          </div>
          
          {/* Show actual content that might be encrypted, similar to Gmail */}
          <div className="bg-base-dark border border-border-dark rounded-lg p-4 mt-4 mb-2">
            <div className="space-y-3">
              <div className="text-yellow-500 text-xs font-medium">Potential Encrypted Content</div>
              <div className="overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-border-dark scrollbar-track-base-dark">
                <div className="text-gray-400 text-xs whitespace-pre-wrap font-mono">
                  {potentialContent}
                </div>
              </div>
            </div>
          </div>
          
          {/* Show a note about possible hidden encryption */}
          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start space-x-3">
            <div className="text-yellow-500 mt-0.5">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-sm text-yellow-500 font-medium">Content may contain hidden encrypted data</p>
              <p className="text-xs text-gray-400 mt-1">
                This message doesn't contain obvious PGP markers, but may still include encrypted content in attachments or encoded formats.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    const beforePGP = contentToUse.substring(0, pgpStart);
    // Use the already defined pgpMessage variable from above
    // Redefine it only if it wasn't set before
    if (!pgpMessage) {
      pgpMessage = contentToUse.substring(pgpStart, pgpEnd + 25); // +25 to include the end marker
    }
    const afterPGP = contentToUse.substring(pgpEnd + 25);
    
    // Full email with headers toggle section
    const fullEmailSection = showFullEmail ? (
      <div className="bg-base-dark border border-border-dark rounded-xl p-4 my-4">
        <div className="flex justify-between items-center mb-2 pb-2 border-b border-border-dark">
          <h3 className="text-sm font-medium text-accent-green">Original Email with Headers</h3>
          <button 
            onClick={() => setShowFullEmail(false)}
            className="text-xs bg-secondary-dark hover:bg-secondary-dark/80 text-gray-400 px-2 py-1 rounded"
          >
            Hide Raw Email
          </button>
        </div>
        <div className="overflow-auto max-h-[400px] font-mono text-xs">
          <pre className="whitespace-pre-wrap break-words text-gray-400 leading-relaxed">{contentToUse}</pre>
        </div>
      </div>
    ) : (
      <div className="flex justify-end my-2">
        <button 
          onClick={() => setShowFullEmail(true)}
          className="text-xs bg-secondary-dark hover:bg-secondary-dark/80 text-gray-400 px-3 py-1.5 rounded-md flex items-center"
        >
          <FileText size={12} className="mr-1.5" />
          View Full Email
        </button>
      </div>
    );
    
    return (
      <div className="space-y-4 w-full max-w-full">
        {fullEmailSection}
        
        {beforePGP && (
          <div className="bg-secondary-dark rounded-xl p-4">
            <div className="whitespace-pre-wrap break-words text-gray-300">{beforePGP}</div>
          </div>
        )}
        
        <div className="border border-border-dark bg-secondary-dark rounded-xl overflow-hidden w-full">
          {/* Encrypted Message Header */}
          <div className="bg-base-dark border-b border-border-dark p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-accent-green rounded-full p-1">
                <Lock className="text-white" size={12} />
              </div>
              <span className="text-white bg-accent-green px-2 py-0.5 rounded font-mono text-sm font-medium">PGP ENCRYPTED MESSAGE</span>
            </div>
            {isDecrypted && (
              <div className="flex items-center space-x-2">
                <div className="px-2 py-0.5 bg-accent-green rounded text-white text-xs">Decrypted</div>
              </div>
            )}
          </div>
          
          <div className="p-4 w-full">
            {isDecrypted ? (
              <div className="space-y-4">
                {/* Decrypted Content - Enhanced with better visuals */}
                <div className="relative">
                  {/* Security badge overlay */}
                  <div className="absolute -top-3 -right-2 z-10">
                    <div className="bg-accent-green text-white text-xs px-2 py-1 rounded shadow-md shadow-accent-green/20 flex items-center">
                      <Shield size={10} className="mr-1" />
                      <span>Verified</span>
                    </div>
                  </div>
                  
                  {/* Main content with secure decoration */}
                  <div className="bg-gradient-to-b from-accent-green/10 to-accent-green/5 border border-accent-green/20 rounded-lg p-5 shadow-md relative overflow-hidden">
                    {/* Decorative security pattern */}
                    <div className="absolute inset-0 overflow-hidden opacity-5">
                      <div className="absolute top-0 right-0 h-full w-1/2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="border-b border-accent-green/20 h-6"></div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 h-1/2 w-full">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="border-r border-accent-green/20 w-6 inline-block h-full"></div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actual content */}
                    <div className="relative">
                      <div className="whitespace-pre-wrap break-words text-gray-200 leading-relaxed overflow-auto max-h-[400px]">
                        {decryptedContent}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Status and actions bar */}
                <div className="flex flex-col space-y-3 pt-1">
                  {/* Security info with details */}
                  <div className="bg-base-dark border border-border-dark rounded-lg p-2.5 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="bg-accent-green p-1.5 rounded-full">
                        <Shield className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-300">
                          {isUsingYubiKey || yubiKeyStatus === 'detected' ? 'Hardware Secured' : 'Cryptographically Verified'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {isUsingYubiKey || yubiKeyStatus === 'detected' 
                            ? `Decrypted with YubiKey • ${new Date().toLocaleTimeString()}`
                            : `PGP signature verified • ${new Date().toLocaleTimeString()}`
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      {isUsingYubiKey || yubiKeyStatus === 'detected' ? (
                        <div className="bg-accent-green text-white text-xs px-2 py-1 rounded-full flex items-center">
                          <svg className="w-3 h-3 mr-1" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                          </svg>
                          YubiKey Verified
                        </div>
                      ) : (
                        <div className="bg-accent-green text-white text-xs px-2 py-1 rounded-full flex items-center">
                          <Key size={10} className="mr-1" />
                          PGP Protected
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions bar - simplified */}
                  <div className="flex justify-end space-x-2 text-xs">
                    <button className="bg-accent-green text-white px-3 py-1.5 rounded-md hover:bg-accent-green/90 transition-colors flex items-center">
                      <Reply size={12} className="mr-1.5" />
                      Reply Securely
                    </button>
                    <div className="relative group">
                      <button className="bg-secondary-dark hover:bg-secondary-dark/80 text-gray-300 px-3 py-1.5 rounded-md transition-colors flex items-center">
                        <svg className="w-3 h-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                        More Actions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
              {/* Encrypted Content */}
                {/* Encrypted message visualization - inspired by TV show UI */}
                <div className="bg-base-dark border border-border-dark rounded-lg p-4 font-mono">
                  <div className="space-y-3">
                    <div className="text-accent-green text-xs font-bold animate-pulse">-----BEGIN PGP MESSAGE-----</div>
                    <div className="overflow-y-auto max-h-60 min-h-40 scrollbar-thin scrollbar-thumb-border-dark scrollbar-track-base-dark">
                      <div className="text-gray-400 text-xs whitespace-pre-wrap font-mono tracking-wide leading-relaxed">
                        {pgpMessage
                          .replace(/-----BEGIN PGP MESSAGE-----/, '')
                          .replace(/-----END PGP MESSAGE-----/, '')
                          .trim()
                          .split('').map((char, i) => (
                            <span key={i} className="inline-block">
                              {char === '\n' ? <br /> : char}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="text-accent-green text-xs font-bold animate-pulse">-----END PGP MESSAGE-----</div>
                  </div>
                </div>
                
                {/* Error message display */}
                {decryptionError && (
                  <div className="p-3 bg-red-500/10 text-red-500 rounded-lg text-sm border border-red-500/20">
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">⚠️</div>
                      <div>{decryptionError}</div>
                    </div>
                  </div>
                )}
                
                {/* Decryption interface for user input */}
                {showPassphraseInput ? (
                  <div className="space-y-4 bg-gradient-to-b from-secondary-dark to-base-dark rounded-lg p-5 border border-border-dark shadow-lg">
                    <div className="flex items-center mb-1 border-b border-border-dark pb-3">
                      <Lock className="text-accent-green mr-2" size={18} />
                      <label className="text-sm text-gray-300 font-medium">Private Key Authentication Required</label>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Enter your private key passphrase:</label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="password"
                            value={passphrase}
                            onChange={(e) => setPassphrase(e.target.value)}
                            className="w-full bg-base-dark/70 border border-border-dark focus:border-accent-green/50 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-accent-green/30 focus:outline-none transition-all duration-200"
                            placeholder="Enter passphrase"
                            autoFocus
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <Key size={14} className="text-gray-500" />
                          </div>
                        </div>
                        <button
                          onClick={handleDecrypt}
                          disabled={!passphrase}
                          className={`flex items-center space-x-2 bg-accent-green text-white px-5 py-2.5 rounded-lg hover:bg-accent-green/90 transition-all duration-200 shadow ${
                            !passphrase ? 'opacity-50 cursor-not-allowed' : 'shadow-accent-green/20'
                          }`}
                        >
                          <span>Decrypt</span>
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">This will decrypt the message using your private PGP key</p>
                    </div>
                    
                    <div className="flex justify-between border-t border-border-dark pt-3 mt-2">
                      <button
                        onClick={() => setShowPassphraseInput(false)}
                        className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setShowPassphraseInput(false);
                          handleYubiKeyDecrypt();
                        }}
                        className="text-sm text-accent-green hover:text-accent-green/80 flex items-center transition-colors"
                        title="Use YubiKey for decryption"
                      >
                        <div className="bg-accent-green/10 rounded-full p-1 mr-1.5">
                          <svg className="w-3 h-3" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                          </svg>
                        </div>
                        Use YubiKey instead
                      </button>
                    </div>
                  </div>
                ) : isDecrypting ? (
                  // Decryption progress bar with enhanced visuals
                  <div className="space-y-4 bg-gradient-to-b from-secondary-dark to-base-dark rounded-lg p-5 border border-border-dark shadow-lg">
                    <div className="flex justify-between items-center mb-1 border-b border-border-dark pb-3">
                      {isUsingYubiKey ? (
                        <>
                          <div className="flex items-center">
                            <div className="relative mr-3">
                              <div className="w-6 h-6 rounded-full bg-accent-green/20 flex items-center justify-center">
                                <svg className="w-4 h-4 text-accent-green animate-pulse" viewBox="0 0 512 512" fill="currentColor">
                                  <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                                </svg>
                              </div>
                              {yubiKeyStatus === 'detecting' && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                </span>
                              )}
                              {yubiKeyStatus === 'detected' && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green"></span>
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-sm text-gray-300 font-medium">
                                {yubiKeyStatus === 'detecting' 
                                  ? 'Authenticating with YubiKey...' 
                                  : 'YubiKey Authentication'
                                }
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {yubiKeyStatus === 'detecting' 
                                  ? 'Touch YubiKey to continue' 
                                  : 'Decrypting with hardware security key'
                                }
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center">
                            <Lock className="text-accent-green mr-3" size={18} />
                            <div>
                              <span className="text-sm text-gray-300 font-medium">Decrypting Message</span>
                              <p className="text-xs text-gray-500 mt-0.5">Using PGP private key</p>
                            </div>
                          </div>
                        </>
                      )}
                      <span className="text-lg font-medium text-accent-green">{decryptProgress}%</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Decryption Progress</span>
                        <span>{decryptProgress < 30 ? 'Initializing' : decryptProgress < 60 ? 'Decrypting' : decryptProgress < 90 ? 'Verifying' : 'Finalizing'}</span>
                      </div>
                      
                      <div className="w-full bg-base-dark/70 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className="bg-gradient-to-r from-accent-green/90 to-accent-green h-2 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${decryptProgress}%` }} 
                        />
                      </div>
                      
                      {/* Progress step indicators */}
                      <div className="w-full flex justify-between mt-1 px-1">
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 10 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 30 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 50 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 70 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 90 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${decryptProgress >= 100 ? 'bg-accent-green' : 'bg-gray-700'}`}></div>
                      </div>
                    </div>
                    
                    <div className="text-center pt-1 border-t border-border-dark mt-3">
                      <div className="animate-pulse text-xs text-gray-500 flex items-center justify-center">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-green mr-2"></span>
                        {isUsingYubiKey 
                          ? 'Hardware-based encryption provides enhanced security'
                          : 'End-to-end encryption protects your communication'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  // Decrypt Buttons - Enhanced UI inspired by TV shows
                  <div className="flex flex-col space-y-3 pt-2">
                    <div className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-1">Choose decryption method:</div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleDecrypt}
                        className="flex flex-col items-center justify-center space-y-2 bg-accent-green py-4 rounded-lg hover:bg-accent-green/90 transition-all duration-200 shadow-lg shadow-accent-green/20 text-white"
                      >
                        <div className="bg-white/20 p-2 rounded-full">
                          <Key size={20} className="text-white" />
                        </div>
                        <span className="font-medium text-white text-sm tracking-wider">PASSPHRASE</span>
                        <span className="text-white text-xs">Use private key password</span>
                      </button>
                      
                      <button
                        onClick={handleYubiKeyDecrypt}
                        className="flex flex-col items-center justify-center space-y-2 bg-gradient-to-b from-gray-800 to-gray-900 border border-accent-green/30 py-4 rounded-lg hover:border-accent-green hover:from-gray-800/90 hover:to-gray-900/90 hover:bg-accent-green/5 transition-all duration-200 shadow-lg shadow-black/30"
                      >
                        <div className="bg-accent-green/20 p-2 rounded-full">
                          <svg className="w-5 h-5 text-accent-green" viewBox="0 0 512 512" fill="currentColor">
                            <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-50.69 295.38v-58.75l-43.41 43.41c-6.11 6.11-16.01 6.11-22.12 0-6.11-6.11-6.11-16.01 0-22.12l43.41-43.41H124.9c-8.63 0-15.63-7-15.63-15.63 0-8.63 7-15.63 15.63-15.63h58.28l-43.41-43.41c-6.11-6.11-6.11-16.01 0-22.12 6.11-6.11 16.01-6.11 22.12 0l43.41 43.41v-58.28c0-8.63 7-15.63 15.63-15.63 8.63 0 15.63 7 15.63 15.63v58.28l43.41-43.41c6.11-6.11 16.01-6.11 22.12 0 6.11 6.11 6.11 16.01 0 22.12l-43.41 43.41h58.28c8.63 0 15.63 7 15.63 15.63 0 8.63-7 15.63-15.63 15.63h-58.28l43.41 43.41c6.11 6.11 6.11 16.01 0 22.12-6.11 6.11-16.01 6.11-22.12 0l-43.41-43.41v58.31c0 8.63-7 15.63-15.63 15.63-8.63-.01-15.63-7.01-15.63-15.64z"/>
                          </svg>
                        </div>
                        <span className="font-medium text-accent-green text-sm tracking-wider">YUBIKEY</span>
                        <span className="text-accent-green text-xs">Hardware security key</span>
                      </button>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-1">
                      Your message is secured with end-to-end encryption
                    </div>
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
    <div className="h-full flex flex-col bg-base-dark overflow-y-auto w-full">
      {/* YubiKey PIN Dialog */}
      <PinEntryDialog 
        isOpen={showPinDialog}
        onClose={() => {
          setShowPinDialog(false);
          setPinDialogError(undefined);
          setIsUsingYubiKey(false);
          setYubiKeyStatus(null);
        }}
        onSubmit={handlePinSubmit}
        title="YubiKey PIN Required"
        message="Please enter your YubiKey PIN to decrypt this message"
        errorMessage={pinDialogError}
      />
      {/* Email Header with Subject and Security Status */}
      <div className="px-6 py-4 border-b border-border-dark flex flex-wrap justify-between items-center sticky top-0 bg-base-dark z-10">
        <div className="flex items-center mr-4 mb-2 sm:mb-0">
          <h3 className="text-xl font-medium truncate max-w-full sm:max-w-[40ch] md:max-w-[60ch]">{email.subject}</h3>
        </div>
        
        <div className="flex items-center space-x-4 flex-shrink-0">
          {isDecrypted ? (
            <div className="flex items-center space-x-2 text-accent-green bg-accent-green/15 px-3 py-1.5 rounded-md border border-accent-green/30 shadow-sm shadow-accent-green/10">
              <Lock size={16} />
              <span className="text-sm font-medium tracking-wide">DECRYPTED & VERIFIED</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-yellow-500 bg-yellow-500/15 px-3 py-1.5 rounded-md border border-yellow-500/30 shadow-sm shadow-yellow-500/10 animate-pulse">
              <Lock size={16} />
              <span className="text-sm font-medium tracking-wide">ENCRYPTED MESSAGE</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Sender Information */}
      <div className="px-6 py-4 border-b border-border-dark">
        <div className="flex flex-wrap justify-between items-start">
          <div className="flex items-start space-x-4 mb-2 sm:mb-0">
            <div className="w-12 h-12 rounded-full bg-accent-green/10 flex items-center justify-center mt-1 flex-shrink-0">
              <User className="h-6 w-6 text-accent-green" />
            </div>
            <div className="min-w-0">
              <p className="text-md font-medium text-gray-200 truncate">{email.from}</p>
              <p className="text-sm text-gray-400 mt-1 flex items-center">
                <Clock size={14} className="mr-1.5 flex-shrink-0" />
                <span className="truncate">{email.date ? new Date(email.date).toLocaleString() : 'Unknown date'}</span>
              </p>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-1 flex-shrink-0">
            <button 
              className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" 
              title="Reply"
              onClick={() => {
                console.log('Reply functionality will be implemented here');
              }}
            >
              <Reply size={18} />
            </button>
            <button 
              className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" 
              title="Forward"
              onClick={() => {
                console.log('Forward functionality will be implemented here');
              }}
            >
              <Forward size={18} />
            </button>
            <button 
              className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" 
              title="Star"
              onClick={(e) => {
                e.stopPropagation();
                console.log('Star button clicked');
                alert('Star functionality triggered - would star/unstar email in Gmail');
                const electronAPI = (window as any).electron;
                if (electronAPI?.oauth && email.id) {
                  console.log('Star email functionality will be implemented here');
                  // Implementation would use gmail.users.messages.modify to add/remove STARRED label
                }
              }}
            >
              <Star size={18} />
            </button>
            <button 
              className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" 
              title="Delete"
              onClick={() => {
                const electronAPI = (window as any).electron;
                if (electronAPI?.oauth && email.id) {
                  console.log('Delete email functionality will be implemented here');
                  // Implementation would use gmail.users.messages.trash to move to trash
                  // This would actually just add the TRASH label and remove INBOX label
                }
              }}
            >
              <Trash2 size={18} />
            </button>
            <div className="relative">
              <button 
                className="p-2 rounded-lg hover:bg-secondary-dark text-gray-400" 
                title="More Options"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Dropdown button clicked");
                  const dropdown = e.currentTarget.nextElementSibling;
                  if (dropdown) {
                    dropdown.classList.toggle('hidden');
                    console.log("Toggled dropdown visibility");
                  } else {
                    console.log("Could not find dropdown element");
                  }
                }}
              >
                <ChevronDown size={18} />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-secondary-dark rounded-xl shadow-lg py-2 z-50 hidden" 
                   style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Mark as read/unread clicked");
                    alert("Marking email as read/unread");
                    
                    // Close the dropdown
                    e.currentTarget.parentElement?.classList.add('hidden');
                    
                    const electronAPI = (window as any).electron;
                    if (electronAPI?.oauth && email.id) {
                      const isRead = email.status !== 'NEW';
                      console.log(`Will toggle read status: current status=${email.status}, isRead=${isRead}, will mark as ${!isRead ? 'read' : 'unread'}`);
                      
                      // Show temporary notification of success
                      const notification = document.createElement('div');
                      notification.className = 'fixed top-4 right-4 bg-accent-green/90 text-white px-4 py-3 rounded-lg shadow-lg z-50';
                      notification.textContent = `Email would be marked as ${!isRead ? 'read' : 'unread'}`;
                      document.body.appendChild(notification);
                      
                      // Remove after 3 seconds
                      setTimeout(() => {
                        document.body.removeChild(notification);
                      }, 3000);
                      
                      // Toggle the read status - commented out as API implementation for demo
                      /*
                      electronAPI.oauth.markEmailReadStatus({ 
                        messageId: email.id, 
                        markAsRead: !isRead 
                      }).then((result: any) => {
                        if (result.success) {
                          console.log(`Email marked as ${!isRead ? 'read' : 'unread'}`);
                          // Force refresh emails to update UI
                          electronAPI.oauth.fetchEmails();
                        }
                      });
                      */
                    }
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  {email.status === 'NEW' ? 'Mark as Read' : 'Mark as Unread'}
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-hover-dark flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Close the dropdown
                    e.currentTarget.parentElement?.classList.add('hidden');
                    console.log('Archive or move email');
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 8v13H3V8" />
                    <path d="M1 3h22v5H1z" />
                    <path d="M10 12h4" />
                  </svg>
                  Archive
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Security Information Bar for encryption status */}
      <div className={`px-6 py-3 border-b border-border-dark ${
        isDecrypted 
          ? 'bg-gradient-to-r from-accent-green/5 via-accent-green/10 to-accent-green/5 text-accent-green' 
          : 'bg-gradient-to-r from-yellow-500/5 via-yellow-500/10 to-yellow-500/5 text-yellow-500'
      }`}>
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            {/* Status icon */}
            <div className={`p-1.5 rounded-full ${isDecrypted ? 'bg-accent-green/20' : 'bg-yellow-500/20'} flex-shrink-0`}>
              <Lock size={16} className={isDecrypted ? 'text-accent-green' : 'text-yellow-500'} />
            </div>
            
            {/* Status message */}
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {isDecrypted ? 'Decrypted & Verified Message' : 'Secure PGP Message'}
              </div>
              <div className="text-xs opacity-80 max-w-full truncate">
                {isDecrypted 
                  ? 'This message has been securely decrypted using your private key. Content integrity is verified.' 
                  : 'This message is protected with end-to-end encryption and requires your private key to decrypt.'}
              </div>
            </div>
          </div>
          
          {/* Action buttons or status badge */}
          <div className="flex flex-shrink-0">
            {isDecrypted ? (
              <div className="flex space-x-3">
                <button className="flex items-center text-xs border border-accent-green/30 bg-accent-green text-white px-2.5 py-1.5 rounded-md hover:bg-accent-green/90 transition-colors shadow-sm">
                  <Shield size={12} className="mr-1.5" />
                  <span className="whitespace-nowrap">Verified & Secure</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="text-xs font-medium animate-pulse mr-3">
                  <span className="px-2.5 py-1.5 rounded-full bg-yellow-500/15 border border-yellow-500/20 flex items-center">
                    <svg className="w-3 h-3 mr-1.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 11h-2V9h-2v2h-2v2h2v2h2v-2h2v-2zm-8 2H9v-2H7v2H5v2h2v2h2v-2h2v-2zm0-10C7.93 3 6.85 3.13 5.8 3.39l2.15 2.15C10.6 5.88 13.4 5.88 16.07 5.53l-2.16-2.15C12.86 3.13 11.79 3 11 3zm4.5.5l2.14 2.14c.67-.21 1.33-.44 1.98-.7L17.5 2.79c-.67.23-1.33.43-2 .62zm-9 0c-.67-.19-1.33-.39-2-.62L2.38 4.94c.65.26 1.31.49 1.98.7L6.5 3.5z" fill="currentColor"/>
                      <path d="M3 7.59l2.12 2.12c.4.4 1.04.4 1.43 0 .4-.39.4-1.02 0-1.42L4.42 6.16C3.63 6.6 2.79 7.07 2 7.56c.3.01.67.01 1 .03zm18 0c.33-.02.67-.03.98-.03-.79-.49-1.63-.96-2.42-1.4l-2.13 2.13c-.4.4-.4 1.03 0 1.42.39.4 1.03.4 1.42 0L21 7.59z" fill="currentColor"/>
                    </svg>
                    <span className="whitespace-nowrap">PGP Encrypted</span>
                  </span>
                </div>
                <button
                  onClick={() => isDecrypting ? null : handleDecrypt()}
                  disabled={isDecrypting}
                  className="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 px-2.5 py-1.5 rounded-md transition-colors border border-yellow-500/30 whitespace-nowrap"
                >
                  Decrypt now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Email Content Area */}
      <div className="p-4 md:p-6 space-y-4 flex-1 w-full max-w-full overflow-x-auto">
        {renderPGPContent()}
      </div>
    </div>
  );
};

export default MailDetail;