import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Loader, AlertCircle, Check, Key, ExternalLink, Upload, Download, Usb } from 'lucide-react';

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
  
  // Check if public key exists when component loads
  useEffect(() => {
    if (!yubiKeyFingerprint) return;
    
    const checkPublicKey = async () => {
      setIsCheckingKey(true);
      setErrorMessage(null);
      
      console.log('[YubiKeyHelper] Checking public key for fingerprint:', yubiKeyFingerprint);
      
      try {
        // Always return that the key is not found for testing
        // Force not found for testing purposes
        console.log('[YubiKeyHelper] FORCING publicKeyFound = false for testing');
        setPublicKeyFound(false);
        setErrorMessage('Your YubiKey public key is not in your GPG keyring. You need to import it to use your YubiKey for signing and encryption.');
        
        // Commented out actual implementation for testing
        /*
        // Check if the public key exists in GPG keyring
        const result = await window.electron.yubikey.checkPublicKey(yubiKeyFingerprint);
        setPublicKeyFound(result.found);
        
        if (!result.found) {
          setErrorMessage('Your YubiKey public key is not in your GPG keyring. You need to import it to use your YubiKey for signing and encryption.');
        }
        */
      } catch (error) {
        console.error('Error checking public key:', error);
        setErrorMessage('Failed to check for public key');
        setPublicKeyFound(false);
      } finally {
        setIsCheckingKey(false);
      }
    };
    
    checkPublicKey();
  }, [yubiKeyFingerprint]);
  
  const handleImportFromKeyserver = async () => {
    if (!yubiKeyFingerprint) return;
    
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Try to import from keyserver
      const result = await window.electron.yubikey.importPublicKeyFromKeyserver(
        yubiKeyFingerprint
      );
      
      if (result.success) {
        setSuccessMessage('Successfully imported your public key from keyserver');
        setPublicKeyFound(true);
      } else {
        setErrorMessage(`Failed to import from keyserver: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing from keyserver:', error);
      setErrorMessage('Failed to import from keyserver');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleImportFromFile = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Try to import from file
      const result = await window.electron.yubikey.importPublicKeyFromFile();
      
      if (result.success) {
        setSuccessMessage('Successfully imported your public key from file');
        setPublicKeyFound(true);
      } else {
        setErrorMessage(`Failed to import from file: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing from file:', error);
      setErrorMessage('Failed to import from file');
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleImportToGPG = async () => {
    setIsImporting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      // Try to directly import to GPG
      const result = await window.electron.yubikey.importToGPG();
      
      if (result.success) {
        setSuccessMessage('Successfully synchronized your YubiKey with GPG');
        // Re-check if public key is now available
        const keyCheckResult = await window.electron.yubikey.checkPublicKey(yubiKeyFingerprint || '');
        setPublicKeyFound(keyCheckResult.found);
      } else {
        setErrorMessage(`Failed to import to GPG: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error importing to GPG:', error);
      setErrorMessage('Failed to import to GPG');
    } finally {
      setIsImporting(false);
    }
  };
  
  // If we're still checking or no fingerprint, show loading
  if (isCheckingKey || !yubiKeyFingerprint) {
    console.log('[YubiKeyHelper] Loading state - fingerprint missing');
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
              </div>
            </div>
          </div>
          
          {successMessage && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
              {successMessage}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
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
            <div className="bg-blue-100 rounded-md p-1.5">
              <Key className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Why do I need to import my public key?</p>
              <p className="mt-1">
                To use your YubiKey for signing and encryption, your GPG keyring needs to know which 
                public key corresponds to the private key on your YubiKey.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3 pt-2">
          <Button 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportToGPG}
            disabled={isImporting}
          >
            {isImporting ? <Loader className="h-4 w-4 animate-spin" /> : <Usb className="h-4 w-4" />}
            <span>Sync YubiKey with GPG</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportFromKeyserver}
            disabled={isImporting}
          >
            {isImporting ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>Import from Keyserver</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 justify-center" 
            onClick={handleImportFromFile}
            disabled={isImporting}
          >
            {isImporting ? <Loader className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>Import from File</span>
          </Button>
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