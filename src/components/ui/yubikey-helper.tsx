import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Loader, AlertCircle, Check, Key, ExternalLink, Upload, Download, Usb, RefreshCw, HelpCircle, Globe, XCircle } from 'lucide-react';

// Internal component to display YubiKey URL status
function YubiKeyURLStatus() {
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    const fetchUrl = async () => {
      try {
        console.log('[YubiKeyURLStatus] Fetching YubiKey URL, attempt:', retryCount + 1);
        const yubiKeyDetectResult = await window.electron.yubikey.detect().catch(err => {
          console.warn('[YubiKeyURLStatus] Error detecting YubiKey:', err);
          return { success: false };
        });
        
        if (!yubiKeyDetectResult.success || !yubiKeyDetectResult.yubikey?.detected) {
          console.warn('[YubiKeyURLStatus] YubiKey not detected during URL check');
          setError('YubiKey not detected. Please connect your YubiKey and try again.');
          setLoading(false);
          return;
        }
        
        // Check if YubiKey has URL
        const hasUrlResult = await window.electron.yubikey.hasPublicKeyURL().catch(err => {
          console.warn('[YubiKeyURLStatus] Error checking if YubiKey has URL:', err);
          return { success: false, hasUrl: false };
        });
        
        if (!hasUrlResult.success || !hasUrlResult.hasUrl) {
          console.warn('[YubiKeyURLStatus] YubiKey does not have a URL set');
          setError('No URL set on YubiKey.');
          setLoading(false);
          return;
        }
        
        // If URL is set, get the actual URL
        const result = await window.electron.yubikey.getPublicKeyURL().catch(err => {
          console.warn('[YubiKeyURLStatus] Error getting YubiKey URL:', err);
          return { success: false };
        });
        
        if (result.success && result.url) {
          console.log('[YubiKeyURLStatus] Successfully retrieved URL:', result.url);
          setUrl(result.url);
        } else {
          if (retryCount < 2) {
            // Retry up to 2 times with a short delay
            console.log('[YubiKeyURLStatus] Failed to get URL, will retry');
            setRetryCount(prev => prev + 1);
            return; // Don't update loading state, we'll retry
          }
          
          console.warn('[YubiKeyURLStatus] Failed to get YubiKey URL after retries');
          setError(result.error || 'Failed to get URL from YubiKey');
        }
      } catch (error) {
        console.error('[YubiKeyURLStatus] Unexpected error getting YubiKey URL:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUrl();
  }, [retryCount]);
  
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  };
  
  if (loading) {
    return (
      <p className="mt-2 text-xs flex items-center">
        <Loader className="h-3 w-3 mr-1.5 animate-spin text-blue-600" /> 
        <span>{retryCount > 0 ? `Retrying YubiKey URL check (${retryCount}/2)...` : 'Checking YubiKey URL...'}</span>
      </p>
    );
  }
  
  if (error) {
    return (
      <div className="mt-2 text-xs flex items-start text-amber-600">
        <XCircle className="h-3 w-3 mr-1.5 mt-0.5 flex-shrink-0" />
        <div>
          <span>{error === 'No URL set on YubiKey.' ? 
            'No public key URL set on your YubiKey. Automatic key retrieval not available.' : 
            error}
          </span>
          <button 
            onClick={handleRetry} 
            className="ml-2 text-blue-600 underline hover:text-blue-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <p className="mt-2 text-xs flex items-center">
      <Globe className="h-3 w-3 mr-1.5 text-blue-600" />
      <span className="font-semibold mr-1">URL:</span>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-blue-600 underline truncate"
        title={url}
      >
        {url}
      </a>
    </p>
  );
}

// Component to import key from the URL set on the YubiKey
function ImportFromURLButton({
  isImporting, 
  importMethod, 
  onImportAttempt,
  setIsImporting,
  setImportMethod,
  setErrorMessage,
  setSuccessMessage
}: {
  isImporting: boolean;
  importMethod: string | null;
  onImportAttempt: () => void;
  setIsImporting: (value: boolean) => void;
  setImportMethod: (value: string | null) => void;
  setErrorMessage: (value: string | null) => void;
  setSuccessMessage: (value: string | null) => void;
}) {
  const [hasUrl, setHasUrl] = useState<boolean | null>(null);
  const [url, setUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkUrl = async () => {
      try {
        // First check if YubiKey is connected
        console.log('[ImportFromURLButton] Checking YubiKey detection, attempt:', retryCount + 1);
        const detectResult = await window.electron.yubikey.detect().catch(err => {
          console.warn('[ImportFromURLButton] Error detecting YubiKey:', err);
          return { success: false };
        });
        
        if (!detectResult.success || !detectResult.yubikey?.detected) {
          console.warn('[ImportFromURLButton] YubiKey not detected');
          setHasUrl(false);
          setLastError('YubiKey not detected');
          setLoading(false);
          return;
        }
        
        // Check if URL is set
        console.log('[ImportFromURLButton] Checking if YubiKey has URL');
        const hasUrlResult = await window.electron.yubikey.hasPublicKeyURL().catch(err => {
          console.warn('[ImportFromURLButton] Error checking if YubiKey has URL:', err);
          return { success: false, hasUrl: false };
        });
        
        if (!hasUrlResult.success) {
          console.warn('[ImportFromURLButton] Failed to check if YubiKey has URL');
          
          if (retryCount < 2) {
            // Retry automatically for transient errors
            console.log('[ImportFromURLButton] Will retry checking URL');
            setRetryCount(prev => prev + 1);
            return; // Don't update hasUrl yet, we'll retry
          }
          
          setHasUrl(false);
          setLastError('Failed to check if YubiKey has URL');
          setLoading(false);
          return;
        }
        
        setHasUrl(hasUrlResult.hasUrl);
        
        // Get URL for display if URL is set
        if (hasUrlResult.hasUrl) {
          console.log('[ImportFromURLButton] YubiKey has URL, fetching it');
          const urlResult = await window.electron.yubikey.getPublicKeyURL().catch(err => {
            console.warn('[ImportFromURLButton] Error getting YubiKey URL:', err);
            return { success: false };
          });
          
          if (urlResult.success && urlResult.url) {
            console.log('[ImportFromURLButton] Got URL:', urlResult.url);
            setUrl(urlResult.url);
          } else {
            console.warn('[ImportFromURLButton] Failed to get URL from YubiKey');
            setLastError('Found URL on YubiKey but failed to read it');
          }
        } else {
          console.log('[ImportFromURLButton] YubiKey does not have URL set');
        }
      } catch (error) {
        console.error('[ImportFromURLButton] Unexpected error checking for YubiKey URL:', error);
        setHasUrl(false);
        setLastError(error instanceof Error ? error.message : 'Unknown error checking YubiKey URL');
      } finally {
        setLoading(false);
      }
    };
    
    checkUrl();
  }, [retryCount]);
  
  const handleImportFromURL = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportMethod('url');
    
    try {
      console.log('[ImportFromURLButton] Starting import from URL');
      
      // Re-check YubiKey connection before proceeding
      const detectResult = await window.electron.yubikey.detect().catch(err => {
        console.warn('[ImportFromURLButton] Error detecting YubiKey before import:', err);
        return { success: false };
      });
      
      if (!detectResult.success || !detectResult.yubikey?.detected) {
        throw new Error('YubiKey not detected. Please reconnect your YubiKey and try again.');
      }
      
      // Try to import from URL
      console.log('[ImportFromURLButton] Importing from card URL');
      const result = await window.electron.yubikey.importPublicKeyFromCardURL().catch(err => {
        console.error('[ImportFromURLButton] Error calling importPublicKeyFromCardURL:', err);
        return { 
          success: false, 
          error: err instanceof Error ? err.message : 'Failed to import from URL' 
        };
      });
      
      if (result.success) {
        console.log('[ImportFromURLButton] Import successful:', result);
        
        let message = result.imported 
          ? 'Successfully imported your public key from URL' 
          : result.message || 'Public key already in GPG keyring';
          
        // Add fingerprint info if available
        if (result.masterKeyFingerprint) {
          const shortFingerprint = result.masterKeyFingerprint.substring(0, 8) + '...';
          message += ` (Key ID: ${shortFingerprint})`;
        }
        
        setSuccessMessage(message);
        onImportAttempt();
      } else {
        console.warn('[ImportFromURLButton] Import failed:', result.error);
        setErrorMessage(`Failed to import from URL: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[ImportFromURLButton] Unexpected error importing from URL:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import from URL');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleRetry = () => {
    setLoading(true);
    setLastError(null);
    setRetryCount(prev => prev + 1);
  };
  
  if (loading) {
    return (
      <Button 
        variant="outline" 
        className="w-full flex items-center gap-2 justify-center opacity-70 cursor-not-allowed" 
        disabled={true}
      >
        <Loader className="h-4 w-4 animate-spin" />
        <span>{retryCount > 0 ? `Checking URL (attempt ${retryCount}/3)...` : 'Checking for Card URL...'}</span>
      </Button>
    );
  }
  
  if (!hasUrl) {
    if (lastError) {
      return (
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 justify-center text-amber-600" 
          onClick={handleRetry}
          disabled={isImporting}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Retry checking for URL</span>
          <span className="text-xs ml-1">({lastError})</span>
        </Button>
      );
    }
    return null;
  }
  
  return (
    <Button 
      variant="outline" 
      className="w-full flex items-center gap-2 justify-center" 
      onClick={handleImportFromURL}
      disabled={isImporting}
    >
      {isImporting && importMethod === 'url' ? 
        <Loader className="h-4 w-4 animate-spin" /> : 
        <Globe className="h-4 w-4" />
      }
      <span>Import from Card URL</span>
      {url && (
        <span className="text-xs text-gray-500 truncate max-w-[100px]" title={url}>
          ({url})
        </span>
      )}
    </Button>
  );
}

interface YubiKeyHelperProps {
  yubiKeyFingerprint?: string;
  onClose?: () => void;
}

export function YubiKeyHelper({ yubiKeyFingerprint, onClose }: YubiKeyHelperProps) {
  const [publicKeyFound, setPublicKeyFound] = useState<boolean | null>(null);
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importMethod, setImportMethod] = useState<string | null>(null);
  const [importAttempts, setImportAttempts] = useState<number>(0);
  
  // Check if public key exists in GPG keyring
  const checkPublicKey = async () => {
    if (!yubiKeyFingerprint) {
      // If no fingerprint provided, try to detect the YubiKey first
      console.log('[YubiKeyHelper] No fingerprint provided, attempting to detect YubiKey');
      setIsCheckingKey(true);
      
      try {
        // Try to detect the YubiKey to get its fingerprint
        const yubiKeyInfo = await window.electron.yubikey.detect();
        
        if (yubiKeyInfo.success && yubiKeyInfo.yubikey && yubiKeyInfo.yubikey.pgpInfo?.signatureKey?.fingerprint) {
          const detectedFingerprint = yubiKeyInfo.yubikey.pgpInfo.signatureKey.fingerprint;
          console.log('[YubiKeyHelper] Auto-detected YubiKey fingerprint:', detectedFingerprint);
          
          // Now check if this fingerprint exists in the GPG keyring
          const result = await window.electron.yubikey.checkPublicKey(detectedFingerprint);
          console.log('[YubiKeyHelper] Check result for detected fingerprint:', result);
          setPublicKeyFound(result.found);
          
          if (!result.found) {
            setErrorMessage('Your YubiKey public key is not in your GPG keyring. You need to import it to use your YubiKey for signing and encryption.');
          } else {
            setSuccessMessage('YubiKey public key is now available in your GPG keyring');
          }
        } else {
          console.log('[YubiKeyHelper] Could not detect YubiKey or get fingerprint');
          setErrorMessage('Could not detect YubiKey or get fingerprint. Make sure your YubiKey is connected.');
          setPublicKeyFound(false);
        }
      } catch (error) {
        console.error('[YubiKeyHelper] Error auto-detecting YubiKey:', error);
        setErrorMessage('Failed to detect YubiKey. Please make sure it is connected properly.');
        setPublicKeyFound(false);
      } finally {
        setIsCheckingKey(false);
      }
      return;
    }
    
    setIsCheckingKey(true);
    setErrorMessage(null);
    
    console.log('[YubiKeyHelper] Checking public key for fingerprint:', yubiKeyFingerprint);
    
    try {
      // Check if the public key exists in GPG keyring
      console.log('[YubiKeyHelper] Checking if public key exists for:', yubiKeyFingerprint);
      const result = await window.electron.yubikey.checkPublicKey(yubiKeyFingerprint);
      console.log('[YubiKeyHelper] Check result:', result);
      setPublicKeyFound(result.found);
      
      if (!result.found) {
        setErrorMessage('Your YubiKey public key is not in your GPG keyring. You need to import it to use your YubiKey for signing and encryption.');
      } else {
        // If we previously had an error but now the key is found, show success
        setSuccessMessage('YubiKey public key is now available in your GPG keyring');
      }
    } catch (error) {
      console.error('Error checking public key:', error);
      setErrorMessage('Failed to check for public key');
      setPublicKeyFound(false);
    } finally {
      setIsCheckingKey(false);
    }
  };
  
  // Check when component loads
  useEffect(() => {
    checkPublicKey();
  }, [yubiKeyFingerprint]);
  
  // When import is successful, re-check after a short delay
  useEffect(() => {
    if (importAttempts > 0) {
      const timer = setTimeout(() => {
        console.log('[YubiKeyHelper] Re-checking key after import attempt');
        checkPublicKey();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [importAttempts]);
  
  const handleImportFromKeyserver = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportMethod('keyserver');
    
    try {
      // If no fingerprint, try to detect it
      let fingerprintToUse = yubiKeyFingerprint;
      
      if (!fingerprintToUse) {
        console.log('[YubiKeyHelper] No fingerprint for keyserver import, detecting...');
        const yubiKeyInfo = await window.electron.yubikey.detect();
        
        if (yubiKeyInfo.success && yubiKeyInfo.yubikey && yubiKeyInfo.yubikey.pgpInfo?.signatureKey?.fingerprint) {
          fingerprintToUse = yubiKeyInfo.yubikey.pgpInfo.signatureKey.fingerprint;
          console.log('[YubiKeyHelper] Auto-detected fingerprint for keyserver import:', fingerprintToUse);
        } else {
          throw new Error('Could not detect YubiKey fingerprint. Please make sure your YubiKey is connected.');
        }
      }
      
      // Now try to import with the fingerprint
      console.log('[YubiKeyHelper] Importing from keyserver with fingerprint:', fingerprintToUse);
      const result = await window.electron.yubikey.importPublicKeyFromKeyserver(fingerprintToUse);
      
      if (result.success) {
        setSuccessMessage('Successfully imported your public key from keyserver');
        setImportAttempts(prev => prev + 1);
      } else {
        setErrorMessage(`Failed to import from keyserver: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing from keyserver:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import from keyserver');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleImportFromFile = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportMethod('file');
    
    try {
      // First make sure YubiKey is detected to set context
      let detectedFingerprint = null;
      try {
        const yubiKeyInfo = await window.electron.yubikey.detect();
        
        if (yubiKeyInfo.success && yubiKeyInfo.yubikey && yubiKeyInfo.yubikey.detected &&
            yubiKeyInfo.yubikey.pgpInfo?.signatureKey?.fingerprint) {
          detectedFingerprint = yubiKeyInfo.yubikey.pgpInfo.signatureKey.fingerprint;
          console.log('[YubiKeyHelper] YubiKey detected with fingerprint:', detectedFingerprint);
        } else {
          console.log('[YubiKeyHelper] YubiKey not detected or no PGP keys found');
        }
      } catch (detectError) {
        console.error('[YubiKeyHelper] Error detecting YubiKey before file import:', detectError);
      }
      
      // Try to import from file
      console.log('[YubiKeyHelper] Starting file import process');
      const result = await window.electron.yubikey.importPublicKeyFromFile();
      console.log('[YubiKeyHelper] File import result:', result);
      
      if (result.success) {
        setSuccessMessage('Successfully imported your public key from file');
        setImportAttempts(prev => prev + 1);
        
        // If we have a fingerprint detected, verify the import worked
        if (detectedFingerprint) {
          setTimeout(async () => {
            try {
              console.log('[YubiKeyHelper] Verifying imported key with fingerprint:', detectedFingerprint);
              const verifyResult = await window.electron.yubikey.checkPublicKey(detectedFingerprint);
              if (verifyResult.found) {
                console.log('[YubiKeyHelper] Key verification successful - key is in GPG keyring');
                setPublicKeyFound(true);
              }
            } catch (verifyError) {
              console.error('[YubiKeyHelper] Error verifying imported key:', verifyError);
            }
          }, 1000);
        }
      } else {
        if (result.error?.includes('canceled') || result.error?.includes('cancelled')) {
          setErrorMessage('File selection was canceled');
        } else {
          setErrorMessage(`Failed to import from file: ${result.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error importing from file:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import from file');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleImportToGPG = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setImportMethod('gpg');
    
    try {
      // First make sure YubiKey is detected
      const yubiKeyInfo = await window.electron.yubikey.detect();
      
      if (!yubiKeyInfo.success || !yubiKeyInfo.yubikey || !yubiKeyInfo.yubikey.detected) {
        throw new Error('YubiKey not detected. Please make sure your YubiKey is connected properly.');
      }
      
      // Now check if it has PGP keys configured
      if (!yubiKeyInfo.yubikey.pgpInfo?.signatureKey?.fingerprint) {
        throw new Error('YubiKey does not have PGP keys configured. Please set up your YubiKey with PGP keys first.');
      }
      
      console.log('[YubiKeyHelper] Attempting direct import to GPG');
      // Try to directly import to GPG
      const result = await window.electron.yubikey.importToGPG();
      
      if (result.success) {
        console.log('[YubiKeyHelper] GPG import successful');
        setSuccessMessage('Successfully synchronized your YubiKey with GPG');
        setImportAttempts(prev => prev + 1);
        
        // After successful import, verify that the key is actually available
        // by checking the fingerprint from the detected YubiKey
        const fingerprintToCheck = yubiKeyInfo.yubikey.pgpInfo.signatureKey.fingerprint;
        setTimeout(async () => {
          try {
            console.log('[YubiKeyHelper] Verifying imported key with fingerprint:', fingerprintToCheck);
            const verifyResult = await window.electron.yubikey.checkPublicKey(fingerprintToCheck);
            if (verifyResult.found) {
              console.log('[YubiKeyHelper] Key verification successful - key is in GPG keyring');
              setPublicKeyFound(true);
            } else {
              console.log('[YubiKeyHelper] Key verification failed - key not found in GPG keyring');
              setErrorMessage('Key was imported but could not be verified in GPG keyring. Please try again or try a different import method.');
            }
          } catch (verifyError) {
            console.error('[YubiKeyHelper] Error verifying imported key:', verifyError);
          }
        }, 1000);
      } else {
        setErrorMessage(`Failed to import to GPG: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing to GPG:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to import to GPG');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleRefresh = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    checkPublicKey();
  };
  
  // If we're still checking, show loading
  if (isCheckingKey) {
    console.log('[YubiKeyHelper] Loading state - checking YubiKey status');
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            <span>YubiKey Helper</span>
          </CardTitle>
          <CardDescription>Checking YubiKey status...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }
  
  console.log('[YubiKeyHelper] Rendering with fingerprint:', yubiKeyFingerprint);
  console.log('[YubiKeyHelper] publicKeyFound:', publicKeyFound);
  
  // If public key found, show success
  if (publicKeyFound) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span>YubiKey Ready</span>
          </CardTitle>
          <CardDescription>Your YubiKey is properly configured and ready to use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 mt-0.5 text-green-600" />
              <div>
                <p className="font-medium">YubiKey public key is available in your GPG keyring</p>
                <p className="mt-1 text-green-600/80">You can now use your YubiKey for signing and encryption</p>
                {importMethod && (
                  <p className="mt-2 text-xs text-green-600/80 italic">
                    {importMethod === 'keyserver' && 'Key was imported from a keyserver'}
                    {importMethod === 'file' && 'Key was imported from a file'}
                    {importMethod === 'gpg' && 'Key was synchronized directly from your YubiKey'}
                  </p>
                )}
                <p className="mt-2 text-sm text-green-700">Fingerprint: <span className="font-mono text-xs">{yubiKeyFingerprint}</span></p>
              </div>
            </div>
          </div>
          
          {successMessage && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {successMessage}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            className="text-blue-600"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            <span>Re-check</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="ml-2"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Get YubiKey info if fingerprint is missing
  useEffect(() => {
    if (!yubiKeyFingerprint) {
      const detectAndUpdateUI = async () => {
        try {
          const yubiKeyInfo = await window.electron.yubikey.detect();
          
          if (yubiKeyInfo.success && yubiKeyInfo.yubikey && yubiKeyInfo.yubikey.detected) {
            console.log('[YubiKeyHelper] YubiKey detected in import options view');
          } else {
            console.log('[YubiKeyHelper] YubiKey not detected in import options view');
            setErrorMessage('YubiKey not detected. Please connect your YubiKey to continue.');
          }
        } catch (error) {
          console.error('[YubiKeyHelper] Error detecting YubiKey in import options view:', error);
        }
      };
      
      detectAndUpdateUI();
    }
  }, [yubiKeyFingerprint]);

  // If public key not found, show import options
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          <span>Import YubiKey Public Key</span>
        </CardTitle>
        <CardDescription>
          Your YubiKey is connected, but the public key is missing from your GPG keyring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2">
            <Check className="h-5 w-5 mt-0.5 text-green-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <div className="flex gap-3">
            <div className="bg-blue-100 rounded-md p-1.5 flex-shrink-0">
              <Key className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Why do I need to import my public key?</p>
              <p className="mt-1">
                To use your YubiKey for signing and encryption, your GPG keyring needs to know which 
                public key corresponds to the private key on your YubiKey.
              </p>
              {yubiKeyFingerprint ? (
                <p className="mt-2 text-xs">
                  <span className="font-semibold">YubiKey Fingerprint:</span> <span className="font-mono">{yubiKeyFingerprint}</span>
                </p>
              ) : (
                <p className="mt-2 text-xs text-blue-600/80 italic">
                  Connect your YubiKey to detect its fingerprint.
                </p>
              )}
              
              {/* Show URL status if available */}
              <YubiKeyURLStatus />
            </div>
          </div>
        </div>
        
        <div className="space-y-3 pt-2">
          <Button 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportToGPG}
            disabled={isImporting}
          >
            {isImporting && importMethod === 'gpg' ? 
              <Loader className="h-4 w-4 animate-spin" /> : 
              <Usb className="h-4 w-4" />
            }
            <span>Sync YubiKey with GPG</span>
            <HelpCircle className="h-3.5 w-3.5 ml-1 text-white/60" />
            <span className="sr-only">This is the easiest and most reliable method</span>
          </Button>
          
          <div className="text-xs text-center text-gray-500 my-1">- OR -</div>
          
          {/* Add URL import option if URL is set */}
          <ImportFromURLButton 
            isImporting={isImporting}
            importMethod={importMethod}
            onImportAttempt={() => setImportAttempts(prev => prev + 1)}
            setIsImporting={setIsImporting}
            setImportMethod={setImportMethod}
            setErrorMessage={setErrorMessage}
            setSuccessMessage={setSuccessMessage}
          />
          
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportFromKeyserver}
            disabled={isImporting}
          >
            {isImporting && importMethod === 'keyserver' ? 
              <Loader className="h-4 w-4 animate-spin" /> : 
              <Download className="h-4 w-4" />
            }
            <span>Import from Keyserver</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportFromFile}
            disabled={isImporting}
          >
            {isImporting && importMethod === 'file' ? 
              <Loader className="h-4 w-4 animate-spin" /> : 
              <Upload className="h-4 w-4" />
            }
            <span>Import from File</span>
          </Button>
          
          {importAttempts > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-blue-600"
              onClick={handleRefresh}
              disabled={isCheckingKey || isImporting}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isCheckingKey ? 'animate-spin' : ''}`} />
              <span>Re-check key status</span>
            </Button>
          )}
        </div>
        
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700 mt-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-5 w-5 mt-0.5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-medium">Need help?</p>
              <p className="mt-1 text-amber-600/90 text-xs">
                Try the "Sync YubiKey with GPG" option first. If that doesn't work, you'll need to export your public key
                from the YubiKey using the YubiKey Manager software and then import it using the "Import from File" option.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="ghost"
          size="sm"
          className="text-blue-600"
          onClick={() => window.open('https://developers.yubico.com/PGP/Importing_keys.html', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          <span>Learn More</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onClose}
        >
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}