import { Lock, Send, X, User, Key, Paperclip, Loader, Search, Usb, AlertCircle, Check, Copy } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { PinEntryDialog } from '../ui/pin-entry-dialog';
import { YubiKeyHelper } from '../ui/yubikey-helper';

interface ComposeEmailProps {
  onCancel?: () => void;
}

interface YubiKeyInfo {
  detected: boolean;
  serial?: string;
  version?: string;
  pgpInfo?: {
    signatureKey?: {
      fingerprint?: string;
    };
    decryptionKey?: {
      fingerprint?: string;
    };
    authenticationKey?: {
      fingerprint?: string;
    };
  };
}

const ComposeEmail = ({ onCancel }: ComposeEmailProps) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [encryptWithPGP, setEncryptWithPGP] = useState(true);
  const [useYubiKey, setUseYubiKey] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [keySearchResults, setKeySearchResults] = useState<Array<{
    fingerprint: string;
    email: string;
    name?: string;
    source?: string;
  }>>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [yubiKeyDetected, setYubiKeyDetected] = useState(false);
  const [yubiKeyInfo, setYubiKeyInfo] = useState<YubiKeyInfo | null>(null);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [searchingKeyOnline, setSearchingKeyOnline] = useState(false);
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string | null>(null);

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
    source?: string;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingRecipient, setIsSearchingRecipient] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // State for YubiKey PIN dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinDialogError, setPinDialogError] = useState<string | undefined>(undefined);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'encrypting' | 'signing' | 'sending'>('idle');
  
  // State for YubiKey Helper dialog
  const [showYubiKeyHelper, setShowYubiKeyHelper] = useState(false);
  const [publicKeyMissing, setPublicKeyMissing] = useState(false);

  // Check for YubiKey when component mounts
  useEffect(() => {
    // Track previous state to avoid unnecessary UI updates
    let previousDetectionState = {
      detected: false,
      serial: '',
      hasKeys: false
    };
    
    const detectYubiKey = async () => {
      if (!(window as any).electron?.yubikey) {
        console.warn('YubiKey API not available');
        return;
      }
      
      try {
        // Don't clear previous state immediately - only update on actual changes
        
        // Quietly check YubiKey status without logging or updating UI yet
        const result = await window.electron.yubikey.detect();
        
        if (result.success && result.yubikey) {
          const isDetected = result.yubikey.detected;
          const serialNumber = result.yubikey.serial || '';
          
          // Check if has PGP keys, but only if detected
          let hasKeys = false;
          if (isDetected) {
            const keysResult = await window.electron.yubikey.hasPGPKeys();
            hasKeys = keysResult.success && (keysResult.hasPGPKeys || false);
          }
          
          // Only update UI if there was a meaningful change in status
          const detectionChanged = previousDetectionState.detected !== isDetected;
          const serialChanged = previousDetectionState.serial !== serialNumber;
          const keysChanged = previousDetectionState.hasKeys !== hasKeys;
          
          if (detectionChanged || serialChanged || keysChanged) {
            console.log('YubiKey status changed:', 
              isDetected ? 'Connected' : 'Not connected',
              hasKeys ? 'with PGP keys' : 'without PGP keys'
            );
            
            // Now update state since there was a change
            setYubiKeyDetected(isDetected);
            setYubiKeyInfo(result.yubikey);
            setUseYubiKey(isDetected && hasKeys);
            
            // Update previous state for next comparison
            previousDetectionState = {
              detected: isDetected,
              serial: serialNumber,
              hasKeys: hasKeys
            };
          }
        }
      } catch (err) {
        // Only log and update UI on actual errors, not just detection failures
        if (previousDetectionState.detected) {
          console.error('Error detecting YubiKey:', err);
          setYubiKeyDetected(false);
          setYubiKeyInfo(null);
          setUseYubiKey(false);
          
          previousDetectionState = {
            detected: false,
            serial: '',
            hasKeys: false
          };
        }
      }
    };
    
    // Detect YubiKey on component mount
    detectYubiKey();
    
    // Set up periodic detection to catch YubiKey connect/disconnect
    // Increased to 15 seconds to reduce frequency and make it less intrusive
    const detectInterval = setInterval(detectYubiKey, 15000);
    
    // Clean up interval on component unmount
    return () => clearInterval(detectInterval);
  }, []);

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
            // If no key found locally, attempt to search online key servers
            // This would be implemented in a real-world scenario
            setSearchingKeyOnline(true);
            setTimeout(() => {
              setSearchingKeyOnline(false);
              setError(`No PGP key found for recipient (${recipient}). Message cannot be encrypted to this user.`);
            }, 2000);
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

  // Effect to search for recipient in the contact list
  useEffect(() => {
    if (!recipient || recipient.length < 3) {
      setShowRecipientDropdown(false);
      return;
    }
    
    const searchForContact = async () => {
      // In a real app, this would search contacts
      // For now, show a simulated dropdown with example contacts
      setKeySearchResults([
        {
          fingerprint: '73EDD52A89DBD6F73AAE6EF2C423BF3C1089C2B1',
          email: 'alice@example.com',
          name: 'Alice Smith',
          source: 'contacts'
        },
        {
          fingerprint: '8A1D9F0A2C6B3E4D5F7A8B9C0D1E2F3A4B5C6D7E',
          email: 'bob@example.com',
          name: 'Bob Johnson',
          source: 'contacts'
        }
      ]);
      
      setShowRecipientDropdown(true);
      setSearchCompleted(true);
    };
    
    if (recipient.length >= 3) {
      searchForContact();
    }
  }, [recipient]);

  // Handle clicking outside of the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecipientDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Select a contact from the dropdown
  const handleSelectContact = (contact: {
    fingerprint: string;
    email: string;
    name?: string;
    source?: string;
  }) => {
    setRecipient(contact.email);
    setSelectedRecipientKey(contact.fingerprint);
    setShowRecipientDropdown(false);
    
    // If this contact has a PGP key, add it to recipient keys
    if (contact.fingerprint) {
      setRecipientKeys([{
        fingerprint: contact.fingerprint,
        email: contact.email,
        name: contact.name,
        source: contact.source
      }]);
      
      // Clear any previous errors about missing recipient keys
      if (error && error.includes('No PGP key found for recipient')) {
        setError(null);
      }
    }
  };
  
  // Handle copying fingerprint to clipboard
  const handleCopyFingerprint = (fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint).then(() => {
      setSuccessMessage('Fingerprint copied to clipboard');
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    }).catch(err => {
      console.error('Failed to copy fingerprint:', err);
    });
  };

  // Handle PIN submission
  const handlePinSubmit = async (pin: string) => {
    setShowPinDialog(false);
    try {
      await handleSendWithPin(pin);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      
      // If the error indicates an incorrect PIN, show the dialog again with error
      if (errorMsg.includes('PIN') || errorMsg.includes('pin') || errorMsg.includes('incorrect')) {
        // Set error message for PIN dialog
        setPinDialogError(errorMsg);
        
        // Short delay to allow the user to see the error message
        setTimeout(() => {
          setShowPinDialog(true);
        }, 300);
      }
    }
  };
  
  // Sign with PIN
  const handleSignWithPin = async (message: string, pin: string): Promise<{
    success: boolean;
    signedMessage: string;
    error?: string;
  }> => {
    console.log('[DEBUG] handleSignWithPin called');
    
    if (!window.electron?.pgp) {
      throw new Error('PGP functionality not available');
    }
    
    // Verify YubiKey is still connected before attempting to sign
    if (useYubiKey) {
      try {
        console.log('[DEBUG] Checking YubiKey is still connected');
        const yubiKeyStatus = await window.electron.yubikey.detect();
        if (!yubiKeyStatus.success || !yubiKeyStatus.yubikey || !yubiKeyStatus.yubikey.detected) {
          // YubiKey was disconnected
          console.log('[DEBUG] YubiKey was disconnected before signing');
          setYubiKeyDetected(false);
          setYubiKeyInfo(null);
          throw new Error('YubiKey has been disconnected. Please reconnect your YubiKey and try again.');
        }
        console.log('[DEBUG] YubiKey is connected and ready for signing');
      } catch (detectionError) {
        console.error('Error verifying YubiKey status before signing:', detectionError);
        // Continue anyway, the signing operation will likely fail with a more specific error
      }
    }
    
    setProcessingStatus('signing');
    setSuccessMessage('Signing message with YubiKey...');
    
    console.log('[DEBUG] Calling pgp.signMessage with PIN');
    const signResult = await window.electron.pgp.signMessage({
      message,
      passphrase: pin // Use the provided PIN
    });
    
    console.log('[DEBUG] signMessage result:', JSON.stringify({
      success: signResult.success,
      hasSignedMessage: !!signResult.signedMessage,
      error: signResult.error,
      yubiKeyDetected: signResult.yubiKeyDetected,
      needsPin: signResult.needsPin
    }));
    
    // Check if YubiKey was disconnected during signing
    if (signResult.yubiKeyDetected === false && useYubiKey) {
      console.log('[DEBUG] YubiKey was disconnected during signing');
      setYubiKeyDetected(false);
      setYubiKeyInfo(null);
      throw new Error('YubiKey was disconnected during signing. Please reconnect your YubiKey and try again.');
    }
    
    // Check if the error indicates missing public key
    if (!signResult.success && signResult.error) {
      console.log('[DEBUG] Sign failed with error:', signResult.error);
      
      if (signResult.error.includes('Failed to import YubiKey signature key') ||
          signResult.error.includes('No public key') ||
          signResult.error.includes('GPG cannot access YubiKey keys') ||
          signResult.error.includes('YubiKey public key is not in your GPG keyring')) {
        
        console.log('[DEBUG] Missing public key error detected, showing YubiKeyHelper');
        // Show YubiKey helper dialog
        setPublicKeyMissing(true);
        setShowYubiKeyHelper(true);
        throw new Error('Your YubiKey public key is not in your GPG keyring. Please import it first.');
      }
    }
    
    if (signResult.success && signResult.signedMessage) {
      console.log('[DEBUG] Signing successful');
      setSuccessMessage('Message signed successfully with YubiKey');
      return {
        success: true,
        signedMessage: signResult.signedMessage,
        error: undefined // Add this for TypeScript
      };
    } else if (signResult.needsPin) {
      console.log('[DEBUG] PIN still needed despite providing one');
      // PIN was incorrect or not provided - should not happen here since we're providing a PIN
      throw new Error('PIN was incorrect. Please try again.');
    } else {
      console.log('[DEBUG] Signing failed with generic error');
      throw new Error(signResult.error || 'Failed to sign message');
    }
  };
  
  // Encrypt with PIN
  const handleEncryptWithPin = async (message: string, pin: string): Promise<{
    success: boolean;
    encryptedMessage: string;
    error?: string;
  }> => {
    if (!window.electron?.pgp) {
      throw new Error('PGP functionality not available');
    }
    
    // Verify YubiKey is still connected before attempting to encrypt
    if (useYubiKey) {
      try {
        const yubiKeyStatus = await window.electron.yubikey.detect();
        if (!yubiKeyStatus.success || !yubiKeyStatus.yubikey || !yubiKeyStatus.yubikey.detected) {
          // YubiKey was disconnected
          setYubiKeyDetected(false);
          setYubiKeyInfo(null);
          throw new Error('YubiKey has been disconnected. Please reconnect your YubiKey and try again.');
        }
      } catch (detectionError) {
        console.error('Error verifying YubiKey status before encryption:', detectionError);
        // Continue anyway, the encryption operation will likely fail with a more specific error
      }
    }
    
    setProcessingStatus('encrypting');
    setSuccessMessage('Encrypting message with YubiKey...');
    
    const encryptResult = await window.electron.pgp.encryptMessage({
      message,
      recipientFingerprints: recipientKeys.map(key => key.fingerprint),
      options: {
        sign: true,
        attachPublicKey: true,
        passphrase: pin // Use the provided PIN
      }
    });
    
    // If encryption failed due to YubiKey being disconnected, update the UI
    if (!encryptResult.success && encryptResult.yubiKeyDetected === false && useYubiKey) {
      setYubiKeyDetected(false);
      setYubiKeyInfo(null);
      throw new Error('YubiKey was disconnected during encryption. Please reconnect your YubiKey and try again.');
    }
    
    if (encryptResult.success && encryptResult.encryptedMessage) {
      setSuccessMessage('Message encrypted successfully with YubiKey');
      return {
        success: true,
        encryptedMessage: encryptResult.encryptedMessage,
        error: undefined // Add this for TypeScript
      };
    } else {
      throw new Error(encryptResult.error || 'Failed to encrypt message');
    }
  };
  
  // Send with PIN
  const handleSendWithPin = async (pin: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let finalMessage = message;
      
      // PGP operations using the provided PIN
      if (encryptWithPGP) {
        if (recipientKeys.length > 0) {
          // Encrypt with PIN
          const encryptResult = await handleEncryptWithPin(message, pin);
          if (encryptResult.success) {
            finalMessage = encryptResult.encryptedMessage;
          } else {
            console.log('[DEBUG] Encrypt failed with error:', encryptResult.error);
            
            // Check for missing YubiKey public key
            if (encryptResult.error && (
              encryptResult.error.includes('YubiKey public key is not in your GPG keyring') ||
              encryptResult.error.includes('Failed to import YubiKey signature key') ||
              encryptResult.error.includes('No public key') ||
              encryptResult.error.includes('GPG cannot access YubiKey keys')
            )) {
              console.log('[DEBUG] Detected missing YubiKey public key in PIN flow');
              setPublicKeyMissing(true);
              setShowYubiKeyHelper(true);
              setError('Your YubiKey public key is not in your GPG keyring. Please import it first.');
              return;
            }
            
            // Check if PIN was incorrect
            if (encryptResult.error?.includes('PIN') || 
                encryptResult.error?.includes('pin') || 
                encryptResult.error?.includes('incorrect')) {
              throw new Error(encryptResult.error || 'Incorrect PIN. Please try again.');
            }
          }
        } else {
          // Sign with PIN
          console.log('[DEBUG] Attempting to sign with PIN');
          const signResult = await handleSignWithPin(message, pin);
          console.log('[DEBUG] Sign result:', JSON.stringify({
            success: signResult.success,
            hasSignedMessage: !!signResult.signedMessage,
            error: signResult.error
          }));
          
          if (signResult.success) {
            finalMessage = signResult.signedMessage;
          } else {
            // Check for missing YubiKey public key
            if (signResult.error && (
              signResult.error.includes('YubiKey public key is not in your GPG keyring') ||
              signResult.error.includes('Failed to import YubiKey signature key') ||
              signResult.error.includes('No public key') ||
              signResult.error.includes('GPG cannot access YubiKey keys')
            )) {
              console.log('[DEBUG] Detected missing YubiKey public key in PIN flow');
              setPublicKeyMissing(true);
              setShowYubiKeyHelper(true);
              setError('Your YubiKey public key is not in your GPG keyring. Please import it first.');
              return;
            }
            
            // Check if PIN was incorrect
            if (signResult.error?.includes('PIN') || 
                signResult.error?.includes('pin') || 
                signResult.error?.includes('incorrect')) {
              throw new Error(signResult.error || 'Incorrect PIN. Please try again.');
            }
          }
        }
      }
      
      // Send email
      setProcessingStatus('sending');
      setSuccessMessage('Sending email...');
      
      if (!(window as any).electron?.oauth) {
        throw new Error('OAuth functionality not available');
      }
      
      const result = await window.electron.oauth.sendEmail({
        to: recipient,
        subject: subject,
        body: finalMessage
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      // Success!
      setSuccessMessage('Email sent successfully!');
      setProcessingStatus('idle');
      setTimeout(() => onCancel?.(), 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMsg);
      setProcessingStatus('idle');
      
      // If the error indicates an incorrect PIN, propagate it to caller
      if (errorMsg.includes('PIN') || errorMsg.includes('pin') || errorMsg.includes('incorrect')) {
        setIsLoading(false);
        throw err; // Propagate error to caller
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSend = async () => {
    // Direct approach to show YubiKeyHelper first - we'll add error handling after testing
    if (yubiKeyInfo?.pgpInfo?.signatureKey?.fingerprint) {
      console.log('Forcing YubiKeyHelper to appear for testing');
      setPublicKeyMissing(true);
      setShowYubiKeyHelper(true);
      return;
    }

    if (!recipient || !subject) {
      setError('Recipient and subject are required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      let finalMessage = message;
      
      // Handle PGP operations (encrypt/sign)
      if (encryptWithPGP) {
        // If we have recipient keys, we can encrypt the message
        if (recipientKeys.length > 0) {
          if (useYubiKey && yubiKeyDetected && yubiKeyInfo?.pgpInfo?.signatureKey?.fingerprint) {
            // Use YubiKey for encryption - first try without PIN
            try {
              setProcessingStatus('encrypting');
              setSuccessMessage('Preparing to encrypt with YubiKey...');
              
              console.log('Using YubiKey fingerprint:', yubiKeyInfo.pgpInfo.signatureKey.fingerprint);
              
              // Try to encrypt - this might fail if PIN is needed
              if (window.electron?.pgp) {
                const encryptResult = await window.electron.pgp.encryptMessage({
                  message,
                  recipientFingerprints: recipientKeys.map(key => key.fingerprint),
                  options: {
                    sign: true,
                    attachPublicKey: true,
                    passphrase: '' // Empty passphrase to test if PIN is needed
                  }
                });
                
                if (encryptResult.success && encryptResult.encryptedMessage) {
                  // Success without PIN
                  finalMessage = encryptResult.encryptedMessage;
                  setSuccessMessage('Message encrypted with YubiKey');
                } else if (encryptResult.error?.includes('PIN') || encryptResult.error?.includes('pin')) {
                  // PIN needed - show PIN dialog
                  setShowPinDialog(true);
                  setIsLoading(false);
                  return; // Exit early - we'll continue after PIN is entered
                } else {
                  throw new Error(encryptResult.error || 'Failed to encrypt message');
                }
              } else {
                throw new Error('PGP functionality not available');
              }
            } catch (yubiErr) {
              // Check if the error suggests a PIN is needed
              const errorMsg = yubiErr instanceof Error ? yubiErr.message : String(yubiErr);
              if (errorMsg.includes('PIN') || errorMsg.includes('pin')) {
                // Show PIN dialog
                setShowPinDialog(true);
                setIsLoading(false);
                return; // Exit early - we'll continue after PIN is entered
              }
              
              throw new Error(`YubiKey operation failed: ${errorMsg}`);
            }
          } else if (!(window as any).electron?.pgp) {
            throw new Error('PGP functionality not available');
          } else {
            // Use regular PGP encryption with signing and public key attachment
            setProcessingStatus('encrypting');
            setSuccessMessage('Encrypting message...');
            
            const result = await window.electron.pgp.encryptMessage({
              message,
              recipientFingerprints: recipientKeys.map(key => key.fingerprint),
              options: {
                sign: true,
                attachPublicKey: true,
                passphrase: '' // In a real app, you'd prompt for this
              }
            });
            
            if (!result.success || !result.encryptedMessage) {
              // Check if PIN is needed
              if (result.error?.includes('PIN') || result.error?.includes('pin')) {
                setShowPinDialog(true);
                setIsLoading(false);
                return; // Exit early - we'll continue after PIN is entered
              }
              
              throw new Error(result.error || 'Failed to encrypt message');
            }
            
            finalMessage = result.encryptedMessage;
            setSuccessMessage('Message encrypted successfully');
          }
        } else {
          // No recipient keys found but PGP is enabled
          // Sign the message without encryption and attach our public key
          if (window.electron?.pgp) {
            try {
              setProcessingStatus('signing');
              setSuccessMessage('Signing message...');
              
              const signResult = await window.electron.pgp.signMessage({
                message,
                passphrase: '' // Try with empty passphrase first
              });
              
              if (signResult.success && signResult.signedMessage) {
                finalMessage = signResult.signedMessage;
                setSuccessMessage('Message signed successfully');
              } else if (signResult.needsPin) {
                // PIN is needed for signing
                setShowPinDialog(true);
                setIsLoading(false);
                return; // Exit early - we'll continue after PIN is entered
              } else {
                // Check if the error is specifically about missing YubiKey public key
              console.warn('Could not sign message:', signResult.error);
              
              // Special case for YubiKey public key missing
              if (signResult.error && (
                signResult.error.includes('YubiKey public key is not in your GPG keyring') ||
                signResult.error.includes('Failed to import YubiKey signature key') ||
                signResult.error.includes('No public key') ||
                signResult.error.includes('GPG cannot access YubiKey keys')
              )) {
                console.log('Detected missing YubiKey public key error, showing helper');
                setPublicKeyMissing(true);
                setShowYubiKeyHelper(true);
                setError('Your YubiKey public key is not in your GPG keyring. Please import it first.');
                setIsLoading(false);
                return; // Exit early to prevent email sending
              } else if (signResult.error === 'No default key pair found for signing') {
                // This is a user education moment - they have PGP enabled but no keys set up
                console.info('No PGP keys configured. Please generate or import keys in settings.');
              }
              
              finalMessage = signResult.originalMessage || message;
              }
            } catch (signError) {
              // Check if the error suggests a PIN is needed
              const errorMsg = signError instanceof Error ? signError.message : String(signError);
              
              // Special case for YubiKey public key missing
              if (errorMsg.includes('YubiKey public key is not in your GPG keyring') ||
                  errorMsg.includes('Failed to import YubiKey signature key') ||
                  errorMsg.includes('No public key') ||
                  errorMsg.includes('GPG cannot access YubiKey keys')) {
                console.log('Detected missing YubiKey public key error in exception, showing helper');
                setPublicKeyMissing(true);
                setShowYubiKeyHelper(true);
                setError('Your YubiKey public key is not in your GPG keyring. Please import it first.');
                setIsLoading(false);
                return; // Exit early to prevent email sending
              } else if (errorMsg.includes('PIN') || errorMsg.includes('pin')) {
                // Show PIN dialog
                setShowPinDialog(true);
                setIsLoading(false);
                return; // Exit early - we'll continue after PIN is entered
              }
              
              console.warn('Error signing message:', signError);
              // Continue with unsigned message
            }
          }
        }
      }
      
      // Add recipient to contacts if they're not already there
      if (window.electron?.pgp && recipient) {
        try {
          // Extract name from email if not in contact list
          const name = recipient.split('@')[0]; // Simple approach - extract username part
          
          // Add to contacts - the backend will handle if it's already there
          const contactResult = await window.electron.pgp.addContact({
            email: recipient,
            name: name.charAt(0).toUpperCase() + name.slice(1) // Simple capitalization
          });
          
          if (contactResult.success) {
            console.log('Added recipient to contacts:', recipient);
          } else if (contactResult.error) {
            console.warn('Note: Could not add contact:', contactResult.error);
          }
        } catch (contactError) {
          console.error('Error adding contact:', contactError);
          // Non-critical error, continue with sending
        }
      }
      
      // Actually send the email via OAuth
      try {
        if (!(window as any).electron?.oauth) {
          throw new Error('OAuth functionality not available');
        }
        
        setSuccessMessage('Sending email...');
        
        const result = await window.electron.oauth.sendEmail({
          to: recipient,
          subject: subject,
          body: finalMessage
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to send email');
        }
        
        console.log('Email sent successfully:', { 
          recipient, 
          subject, 
          isEncrypted: encryptWithPGP && recipientKeys.length > 0,
          usingYubiKey: useYubiKey && yubiKeyDetected
        });
        
        // Success, close the compose window after a brief delay to show success message
        setSuccessMessage('Email sent successfully!');
        setTimeout(() => onCancel?.(), 1500);
      } catch (sendErr) {
        throw new Error(`Failed to send email: ${sendErr instanceof Error ? sendErr.message : 'Unknown error'}`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      console.log('[DEBUG] handleSend caught error:', errorMsg);
      
      // Special case for YubiKey public key missing
      if (errorMsg.includes('YubiKey public key is not in your GPG keyring') ||
          errorMsg.includes('Failed to import YubiKey signature key') ||
          errorMsg.includes('No public key') ||
          errorMsg.includes('GPG cannot access YubiKey keys')) {
        
        console.log('[DEBUG] Final error handler caught missing public key error, showing YubiKeyHelper');
        setPublicKeyMissing(true);
        setShowYubiKeyHelper(true);
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#030b1a] p-4 md:p-6 overflow-y-auto">
      {/* YubiKey PIN Dialog */}
      <PinEntryDialog 
        isOpen={showPinDialog}
        onClose={() => {
          setShowPinDialog(false);
          setPinDialogError(undefined);
        }}
        onSubmit={handlePinSubmit}
        title="YubiKey PIN Required"
        message="Please enter your YubiKey PIN to continue with signing/encryption"
        errorMessage={pinDialogError}
      />
      
      {/* YubiKey Helper Dialog - show when public key is missing */}
      {showYubiKeyHelper && yubiKeyInfo?.pgpInfo?.signatureKey?.fingerprint && (() => {
        console.log('[DEBUG] Rendering YubiKeyHelper component with fingerprint:', yubiKeyInfo.pgpInfo.signatureKey.fingerprint);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <YubiKeyHelper 
              yubiKeyFingerprint={yubiKeyInfo.pgpInfo.signatureKey.fingerprint}
              onClose={() => setShowYubiKeyHelper(false)}
            />
          </div>
        );
      })()}
      {showYubiKeyHelper && (() => {
        console.log('[DEBUG] showYubiKeyHelper is true but fingerprint might be missing:', 
          yubiKeyInfo?.pgpInfo?.signatureKey?.fingerprint || 'No fingerprint');
        return null;
      })()}
      
      {/* Email Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#0c1c3d]">
        <div className="flex items-center space-x-3">
          <Lock className="text-[#12d992]" size={20} style={{ filter: 'drop-shadow(0 0 4px rgba(18, 217, 146, 0.3))' }} />
          <span className="text-lg font-medium text-white" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>New Encrypted Message</span>
          {/* YubiKey connection indicator */}
          {yubiKeyDetected ? (
            <div className="bg-blue-500/20 flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-blue-500/30">
              <Usb className="w-3 h-3 text-blue-400" />
              <span className="text-blue-400">YubiKey Connected</span>
            </div>
          ) : (
            <div className="bg-gray-500/20 flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-gray-500/30">
              <Usb className="w-3 h-3 text-gray-400" />
              <span className="text-gray-400">YubiKey Not Connected</span>
            </div>
          )}
          
          {/* Processing Status Indicator */}
          {processingStatus !== 'idle' && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs border border-[#12d992]/30 bg-[#12d992]/10">
              <Loader className="w-3 h-3 text-[#12d992] animate-spin" />
              <span className="text-[#12d992]">
                {processingStatus === 'encrypting' && 'Encrypting...'}
                {processingStatus === 'signing' && 'Signing...'}
                {processingStatus === 'sending' && 'Sending...'}
              </span>
            </div>
          )}
        </div>
        <button 
          onClick={onCancel}
          className="text-[#526583] hover:text-gray-300"
        >
          <X size={20} />
        </button>
      </div>

      {/* Status Messages */}
      {successMessage && (
        <div className="bg-green-500/10 text-green-500 p-4 rounded-lg mb-4 flex items-center gap-2">
          <Check size={16} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Form */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header fields section (horizontal layout) */}
        <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-2 w-full">
          {/* "To" row */}
          <div className="flex items-center justify-end pr-2">
            <span className="text-[#526583] text-sm font-medium">To:</span>
          </div>
          
          <div className="relative">
            <div className="flex w-full relative">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-[#041024] px-4 py-3 rounded-lg border border-[#0c1c3d] focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 text-white text-sm pr-20"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' }}
              />
              
              {/* Search contact button - inside the input field */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {isSearchingRecipient && (
                  <Loader className="w-4 h-4 animate-spin text-[#526583]" />
                )}
                
                {encryptWithPGP && recipient && recipientKeys.length > 0 && (
                  <Lock className="w-4 h-4 text-[#12d992]" />
                )}
                
                <button 
                  className="bg-[#0a1c3d] p-1.5 rounded-md flex items-center justify-center hover:bg-[#142c4f] transition-colors"
                  onClick={() => setShowRecipientDropdown(true)}
                >
                  <Search className="w-3.5 h-3.5 text-[#7a8aaa]" />
                </button>
              </div>
            </div>
            
            {/* Recipient dropdown */}
            {showRecipientDropdown && (
              <div 
                ref={dropdownRef}
                className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 bg-[#041024] border border-[#0c1c3d] rounded-lg shadow-lg py-1 max-h-[200px] overflow-y-auto"
              >
                {keySearchResults.length > 0 ? (
                  keySearchResults.map((result, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 hover:bg-[#0a1c3d] cursor-pointer flex items-center justify-between"
                      onClick={() => handleSelectContact(result)}
                    >
                      <div>
                        <div className="text-white text-sm font-medium">{result.name}</div>
                        <div className="text-[#526583] text-xs">{result.email}</div>
                      </div>
                      {result.fingerprint && (
                        <div className="flex items-center gap-1 text-xs text-[#12d992]">
                          <Key size={12} />
                          <span>PGP</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-[#526583] text-sm">No contacts found</div>
                )}
              </div>
            )}
            
            {encryptWithPGP && recipient && recipientKeys.length > 0 && (
              <div className="mt-1 text-xs text-[#12d992] flex items-center gap-1.5" style={{ textShadow: '0 0 5px rgba(18, 217, 146, 0.2)' }}>
                <Lock size={12} />
                <span>PGP key found for this recipient</span>
              </div>
            )}
            
            {encryptWithPGP && recipient && recipientKeys.length === 0 && searchingKeyOnline && (
              <div className="mt-1 text-xs text-yellow-500 flex items-center gap-1.5">
                <Loader size={12} className="animate-spin" />
                <span>Searching for recipient's public key...</span>
              </div>
            )}
          </div>
          
          {/* "Subject" row */}
          <div className="flex items-center justify-end pr-2">
            <span className="text-[#526583] text-sm font-medium">Subject:</span>
          </div>
          
          <div>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#041024] px-4 py-3 rounded-lg border border-[#0c1c3d] focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 text-white text-sm"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)' }}
            />
          </div>
        </div>
        
        {/* Message body */}
        <div className="flex-1 w-full min-h-[300px]">
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
          <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-2 w-full">
            <div className="flex items-start justify-end pr-2 pt-2">
              <span className="text-[#526583] text-sm font-medium">Attachments:</span>
            </div>
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-[#041024] rounded-lg py-2 px-4 border border-[#0c1c3d]">
                  <span className="text-sm text-[#c1d1f7]">{file.name}</span>
                  <button 
                    onClick={() => handleRemoveAttachment(index)}
                    className="text-[#526583] hover:text-gray-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* YubiKey info section */}
        {encryptWithPGP && (
          <div className="grid grid-cols-[80px_1fr] md:grid-cols-[120px_1fr] gap-2 w-full">
            <div className="flex items-start justify-end pr-2 pt-2">
              <div className="flex items-center gap-1.5">
                <Usb className={yubiKeyDetected ? "text-blue-400" : "text-gray-400"} size={14} />
                <span className="text-[#526583] text-sm font-medium">YubiKey:</span>
              </div>
            </div>
            
            {yubiKeyDetected && yubiKeyInfo?.pgpInfo ? (
              <div className="bg-[#041024] border border-[#0c1c3d] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#c1d1f7]">PGP Keys</span>
                  </div>
                  {yubiKeyInfo.serial && (
                    <div className="text-xs text-[#526583]">Serial: {yubiKeyInfo.serial}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {yubiKeyInfo.pgpInfo.signatureKey?.fingerprint && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-[#526583]">Signature Key</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#0a1c3d] p-1.5 rounded flex items-center justify-center">
                          <Key size={12} className="text-[#12d992]" />
                        </div>
                        <div className="text-xs text-[#c1d1f7] truncate flex-1">
                          {yubiKeyInfo.pgpInfo.signatureKey.fingerprint.substring(0, 8)}...
                        </div>
                        <button 
                          className="text-[#526583] hover:text-gray-300"
                          onClick={() => yubiKeyInfo?.pgpInfo?.signatureKey?.fingerprint && 
                            handleCopyFingerprint(yubiKeyInfo.pgpInfo.signatureKey.fingerprint)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {yubiKeyInfo.pgpInfo.decryptionKey?.fingerprint && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-[#526583]">Decryption Key</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#0a1c3d] p-1.5 rounded flex items-center justify-center">
                          <Lock size={12} className="text-[#12d992]" />
                        </div>
                        <div className="text-xs text-[#c1d1f7] truncate flex-1">
                          {yubiKeyInfo.pgpInfo.decryptionKey.fingerprint.substring(0, 8)}...
                        </div>
                        <button 
                          className="text-[#526583] hover:text-gray-300"
                          onClick={() => yubiKeyInfo?.pgpInfo?.decryptionKey?.fingerprint && 
                            handleCopyFingerprint(yubiKeyInfo.pgpInfo.decryptionKey.fingerprint)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {yubiKeyInfo.pgpInfo.authenticationKey?.fingerprint && (
                    <div className="flex flex-col space-y-1">
                      <span className="text-xs text-[#526583]">Authentication Key</span>
                      <div className="flex items-center gap-1.5">
                        <div className="bg-[#0a1c3d] p-1.5 rounded flex items-center justify-center">
                          <Key size={12} className="text-[#12d992]" />
                        </div>
                        <div className="text-xs text-[#c1d1f7] truncate flex-1">
                          {yubiKeyInfo.pgpInfo.authenticationKey.fingerprint.substring(0, 8)}...
                        </div>
                        <button 
                          className="text-[#526583] hover:text-gray-300"
                          onClick={() => yubiKeyInfo?.pgpInfo?.authenticationKey?.fingerprint && 
                            handleCopyFingerprint(yubiKeyInfo.pgpInfo.authenticationKey.fingerprint)}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#041024] border border-[#0c1c3d] rounded-lg p-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <Usb className="text-gray-500 h-8 w-8" />
                  </div>
                  <p className="text-[#526583] text-sm">YubiKey not connected.</p>
                  <p className="text-[#526583] text-xs mt-1">Connect your YubiKey to enable hardware-based encryption and signing.</p>
                </div>
              </div>
            )}
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
          
          {encryptWithPGP && yubiKeyDetected && (
            <label className="flex items-center space-x-2 text-sm text-[#c1d1f7]/80 cursor-pointer">
              <input
                type="checkbox"
                checked={useYubiKey}
                onChange={(e) => setUseYubiKey(e.target.checked)}
                className="form-checkbox rounded bg-[#041024] border-[#0c1c3d] text-blue-400"
              />
              <span className="flex items-center gap-1.5">
                <Usb size={14} className="text-blue-400" />
                <span>Use YubiKey</span>
              </span>
            </label>
          )}
          
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
              <span>
                {encryptWithPGP ? 
                  (useYubiKey && yubiKeyDetected ? 'Using YubiKey...' : 'Encrypting...') : 
                  'Sending...'}
              </span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                {encryptWithPGP ? 
                  (useYubiKey && yubiKeyDetected ? 'Send with YubiKey' : 'Send Encrypted') : 
                  'Send'}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ComposeEmail;