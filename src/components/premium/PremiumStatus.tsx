import React, { useState, useEffect } from 'react';
import { PremiumStatus as PremiumStatusType } from '../../types/electron';
import { Badge, Star, Bitcoin, RefreshCw, CheckCircle, ChevronRight, Lock, Shield, X, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PremiumStatusProps {
  checkPayment?: boolean;
  showUpgrade?: boolean;
  onClose?: () => void;
}

const PremiumStatus: React.FC<PremiumStatusProps> = ({ 
  checkPayment = true,
  showUpgrade = true,
  onClose
}) => {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatusType | null>(null);
  const [bitcoinAddress, setBitcoinAddress] = useState<string | null>(null);
  const [bitcoinPrice, setBitcoinPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Timer reference for auto-checking payments
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoCheckActive, setAutoCheckActive] = useState(false);
  
  useEffect(() => {
    loadPremiumStatus();
    
    // Clean up timer on unmount
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);
  
  // Start auto-checking when bitcoin address is displayed
  useEffect(() => {
    if (bitcoinAddress && !premiumStatus?.isPremium && !autoCheckActive) {
      console.log('Starting automatic payment checking every 20 seconds');
      setAutoCheckActive(true);
      
      // Set up a periodic check every 20 seconds
      const intervalId = setInterval(() => {
        if (!loadingPayment) {
          console.log('Auto-checking payment status...');
          checkPremiumPayment(true);
        }
      }, 20000); // 20 seconds
      
      setCheckInterval(intervalId);
      
      // Clean up on unmount or when premium becomes active
      return () => {
        clearInterval(intervalId);
        setCheckInterval(null);
        setAutoCheckActive(false);
      };
    }
    
    // If premium becomes active, stop checking
    if (premiumStatus?.isPremium && checkInterval) {
      clearInterval(checkInterval);
      setCheckInterval(null);
      setAutoCheckActive(false);
    }
  }, [bitcoinAddress, premiumStatus?.isPremium]);

  const loadPremiumStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check existing premium status
      const result = await window.electron.premium.getStatus();
      
      if (result.success && result.status) {
        setPremiumStatus(result.status);
        
        // If we have an email but payment is not verified, we already have a Bitcoin address
        if (result.status.email && result.status.bitcoinAddress && !result.status.paymentVerified) {
          setBitcoinAddress(result.status.bitcoinAddress);
        }
        
        // If we're supposed to check for payment and not already verified
        if (checkPayment && !result.status.paymentVerified) {
          checkPremiumPayment();
        }
      } else {
        // Initialize with default values
        setPremiumStatus({
          isPremium: false
        });
      }
    } catch (err) {
      setError('Failed to load premium status');
      console.error('Error loading premium status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getEmailAddress = async (): Promise<string | null> => {
    try {
      // Try IMAP credentials first
      const imapResult = await window.electron.credentials.getImap();
      if (imapResult.success && imapResult.credentials?.email) {
        console.log('Found email from IMAP credentials:', imapResult.credentials.email);
        return imapResult.credentials.email;
      }
      
      // Try Gmail credentials as fallback
      const gmailResult = await window.electron.credentials.getGmail();
      if (gmailResult.success && gmailResult.credentials?.email) {
        console.log('Found email from Gmail credentials:', gmailResult.credentials.email);
        return gmailResult.credentials.email;
      }
      
      // Try OAuth
      try {
        const authResult = await window.electron.oauth.checkAuth();
        if (authResult.success && authResult.isAuthenticated) {
          // Fetch emails to get user's email address
          const emailsResult = await window.electron.oauth.fetchEmails();
          if (emailsResult.success && emailsResult.emails && emailsResult.emails.length > 0) {
            // The first email's 'from' field likely contains the user's email
            const userEmail = emailsResult.emails[0].from;
            if (userEmail) {
              console.log('Found email from OAuth emails:', userEmail);
              return userEmail;
            }
          }
          
          // If no emails, try another approach
          console.log('OAuth is authenticated but could not determine email address');
        }
      } catch (oauthError) {
        console.error('Error accessing OAuth information:', oauthError);
      }
      
      return null;
    } catch (err) {
      console.error('Error getting email address:', err);
      return null;
    }
  };

  const generateBitcoinAddress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's email address from credentials
      const email = await getEmailAddress();
      
      if (!email) {
        setError('Could not find an email address. Please connect to your email account first.');
        return;
      }

      const result = await window.electron.premium.getBitcoinAddress({ email });
      
      if (result.success && result.address) {
        setBitcoinAddress(result.address);
        if (result.price) {
          setBitcoinPrice(result.price);
        }
        
        // Update premium status with additional price information
        setPremiumStatus(prevStatus => ({
          ...prevStatus || { isPremium: false },
          email,
          bitcoinAddress: result.address,
          premiumPriceUSD: result.priceUSD,
          premiumPriceBTC: result.price,
          btcPriceUSD: result.btcPrice
        }));
        
        // Save this in the premium service
        await window.electron.premium.setStatus({
          status: {
            email,
            bitcoinAddress: result.address
          }
        });
      } else {
        setError(result.error || 'Failed to generate Bitcoin address');
      }
    } catch (err) {
      setError('An error occurred while generating the Bitcoin address');
      console.error('Error generating Bitcoin address:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPremiumPayment = async (force: boolean = false) => {
    try {
      setLoadingPayment(true);
      setError(null);

      const result = await window.electron.premium.checkPayment({ forceCheck: force });
      
      if (result.success && result.status) {
        setPremiumStatus(result.status);
        
        // Store debug info if available
        if (result.debug) {
          console.log('Payment check debug info:', result.debug);
          setDebugInfo(result.debug);
        }
      } else {
        setError(result.error || 'Failed to check payment status');
        if (result.debug) {
          console.log('Payment check error debug:', result.debug);
          setDebugInfo(result.debug);
        }
      }
    } catch (err) {
      setError('An error occurred while checking payment');
      console.error('Error checking payment:', err);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Development testing functions removed for production

  // If we don't want to show the upgrade prompt, only show status if premium
  if (!showUpgrade && (!premiumStatus || !premiumStatus.isPremium)) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-green mx-auto"></div>
        <p className="text-gray-400 text-sm mt-2">Loading premium status...</p>
      </div>
    );
  }

  if (premiumStatus?.isPremium || premiumStatus?.hasExpired) {
    // Check if premium has expired
    const hasExpired = premiumStatus?.hasExpired === true;
    const statusColor = hasExpired ? "text-amber-500" : "text-accent-green";
    const borderColor = hasExpired ? "border-amber-500/30" : "border-accent-green/30";
    const bgColor = hasExpired ? "bg-amber-500/10" : "bg-accent-green/10";
    
    return (
      <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
        <div className="p-4 relative">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700/50"
            >
              <X size={16} />
            </button>
          )}
          <div className="flex items-center space-x-2 mb-3">
            <Star className={`h-5 w-5 ${hasExpired ? "text-amber-500" : "text-yellow-400 fill-yellow-400"}`} />
            <h3 className="text-white font-semibold text-lg">
              {hasExpired ? "Premium Expired" : "Premium Status Active"}
            </h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white">
              <span>Status:</span>
              <span className={`font-medium ${hasExpired ? "text-amber-500" : "text-white"} flex items-center`}>
                {hasExpired ? (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    Expired
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Active
                  </>
                )}
              </span>
            </div>
            
            {premiumStatus.expiresAt && (
              <div className="flex justify-between text-white">
                <span>{hasExpired ? "Expired:" : "Expires:"}</span>
                <span className={`font-medium ${hasExpired ? "text-amber-500" : "text-white"}`}>
                  {new Date(premiumStatus.expiresAt).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {premiumStatus.email && (
              <div className="flex justify-between text-white">
                <span>Email:</span>
                <span className="font-medium text-white">{premiumStatus.email}</span>
              </div>
            )}
            
            {premiumStatus.paymentAmount && (
              <div className="flex justify-between text-white">
                <span>Payment:</span>
                <span className={`font-medium ${premiumStatus.partialPayment ? 'text-amber-500' : 'text-white'}`}>
                  {premiumStatus.paymentAmount} BTC
                  {premiumStatus.partialPayment && ' (partial)'}
                </span>
              </div>
            )}
            
            {premiumStatus.partialPayment && (
              <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 text-amber-400 text-xs">
                Note: Your payment was slightly less than the requested amount, but was accepted because it was made more than 24 hours ago.
              </div>
            )}
          </div>
          
          {hasExpired ? (
            <button
              onClick={generateBitcoinAddress}
              className="w-full mt-4 bg-amber-500 text-white p-2 rounded-md hover:bg-amber-600 font-medium flex items-center justify-center"
            >
              <Bitcoin className="h-4 w-4 mr-2" />
              Renew Premium Subscription
            </button>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                <Lock className="h-3 w-3 mr-1" />
                End-to-End Encryption
              </div>
              <div className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                <Star className="h-3 w-3 mr-1" />
                Priority Support
              </div>
              <div className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                <Shield className="h-3 w-3 mr-1" />
                Advanced Features
              </div>
            </div>
          )}
        </div>
        
        {/* Development tools removed for production */}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700/50"
        >
          <X size={16} />
        </button>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      <div className="p-4 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-300 p-1 rounded-full hover:bg-gray-700/50"
          >
            <X size={16} />
          </button>
        )}
        <div className="flex items-center space-x-2 mb-3">
          <Star className="h-5 w-5 text-gray-500" />
          <h3 className="text-white font-semibold text-lg">Upgrade to Premium</h3>
        </div>
        
        {!bitcoinAddress ? (
          // Step 1: Generate Bitcoin address
          <div>
            <p className="text-white text-sm mb-4">
              Upgrade to premium for enhanced security features and priority support.
              We use Bitcoin for a self-verifying payment system that requires no centralized server.
            </p>
            
            <button
              onClick={generateBitcoinAddress}
              disabled={isLoading}
              className="w-full mt-2 bg-accent-green text-white p-2 rounded-md hover:bg-accent-green/90 font-medium flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Generating...
                </>
              ) : (
                <>
                  <Bitcoin className="h-4 w-4 mr-2" />
                  Generate Payment Address
                </>
              )}
            </button>
          </div>
        ) : (
          // Step 2: Show payment information
          <div>
            <div className="bg-gray-800/50 rounded-lg p-3 mb-3 text-sm">
              <div className="flex justify-between items-center mb-2">
                <p className="text-white font-medium">Premium Subscription:</p>
                <span className="text-accent-green font-bold">${premiumStatus?.premiumPriceUSD || 39} USD / Year</span>
              </div>
              
              <div className="bg-gray-900/50 p-2 rounded border border-gray-700 mb-3">
                <div className="flex justify-between mb-1">
                  <span className="text-white text-xs">Amount to send:</span>
                  <span className="text-white font-mono text-xs">{bitcoinPrice?.toFixed(8) || "0.00046738"} BTC</span>
                </div>
                {premiumStatus?.btcPriceUSD && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white">Current BTC rate:</span>
                    <span className="text-white">${premiumStatus.btcPriceUSD.toLocaleString()} USD</span>
                  </div>
                )}
              </div>
              
              <p className="text-white text-xs mb-1">
                Send the exact amount to this address to activate premium features. 
                The system will automatically detect your payment.
              </p>
              <p className="text-amber-400 text-xs">
                Please note: Bitcoin transactions can take 10-60 minutes to confirm.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg mb-3 mx-auto w-fit">
              <QRCodeSVG 
                value={`bitcoin:${bitcoinAddress}?amount=${
                  // Use the premium price if available with 8 decimal precision
                  premiumStatus?.premiumPriceBTC
                    ? premiumStatus.premiumPriceBTC.toFixed(8)
                    : bitcoinPrice?.toFixed(8) || "0.00046736"
                }`} 
                size={160}
                level="H"
                margin={2}
              />
            </div>
            
            <div className="bg-gray-800 p-3 rounded-lg text-xs font-mono text-white break-all mb-1">
              {bitcoinAddress}
            </div>
            
            {/* QR code info for developers */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-900 p-2 rounded-lg text-[9px] font-mono text-gray-500 break-all mb-3">
                QR code: bitcoin:{bitcoinAddress}?amount={
                  premiumStatus?.premiumPriceBTC 
                    ? premiumStatus.premiumPriceBTC.toFixed(8) 
                    : bitcoinPrice?.toFixed(8) || "0.00046736"
                }
              </div>
            )}
            
            {/* Link to view address on blockchain explorer */}
            {bitcoinAddress && (
              <div className="mt-2 mb-3 p-2 rounded-lg bg-gray-800/50 text-xs">
                <a 
                  href={`https://mempool.space/address/${bitcoinAddress}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-accent-green hover:underline flex items-center"
                >
                  <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View transaction on blockchain
                </a>
              </div>
            )}
            
            {/* Payment verification details - customer friendly */}
            {bitcoinAddress && debugInfo && (
              <div className="mb-3 p-2.5 rounded-lg border border-accent-green/30 bg-accent-green/5 text-xs text-white">
                <h4 className="font-medium text-accent-green mb-2 flex items-center">
                  <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment Verification Details
                </h4>
                <div className="space-y-1.5 pl-1">
                  <div className="flex justify-between">
                    <span>Verification Status:</span>
                    <span className={debugInfo.paymentVerified ? 'text-accent-green' : 'text-amber-400'}>
                      {debugInfo.paymentVerified ? '✓ Verified' : '⌛ Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount Received:</span>
                    <span>{debugInfo.paymentAmount || 0} BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Required Amount:</span>
                    <span>{debugInfo.requiredAmount?.toFixed(8) || 0} BTC</span>
                  </div>
                  <div className="flex justify-between text-sm opacity-75">
                    <span>With 5% tolerance:</span>
                    <span>{debugInfo.requiredAmount ? (debugInfo.requiredAmount * 0.95).toFixed(8) : 0} BTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current BTC Price:</span>
                    <span>${debugInfo.btcPrice?.toLocaleString() || 0} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Checked:</span>
                    <span>{debugInfo.lastChecked ? new Date(debugInfo.lastChecked).toLocaleString() : 'Never'}</span>
                  </div>
                  {premiumStatus?.partialPayment && (
                    <div className="mt-1 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400 text-[10px]">
                      Note: Your payment was slightly below the required amount, but was accepted because it was made more than 24 hours ago.
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => checkPremiumPayment(true)}
                  disabled={loadingPayment}
                  className="flex items-center space-x-2 text-accent-green hover:text-accent-green/80"
                  title="Force check now"
                >
                  {loadingPayment ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-green"></span>
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span>Check Payment</span>
                </button>
                
                {autoCheckActive && (
                  <div className="flex items-center text-white text-xs">
                    <span className="animate-pulse h-2 w-2 bg-accent-green/70 rounded-full mr-1.5"></span>
                    <span>Auto-checking</span>
                  </div>
                )}
              </div>
              
              {/* Development tools removed for production */}
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-purple-600/20 via-indigo-600/20 to-blue-600/20 p-3 border-t border-gray-700">
        <div className="text-xs text-white flex justify-between items-center">
          <div className="flex items-center">
            <Badge className="h-3 w-3 mr-1 text-accent-green" />
            <span>Premium Features</span>
          </div>
          <ChevronRight className="h-4 w-4 text-white" />
        </div>
      </div>
    </div>
  );
};

export default PremiumStatus;