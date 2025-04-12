import React, { useState, useEffect } from 'react';
import { Key, Save, RefreshCw, AlertTriangle, CheckCircle, Lock } from 'lucide-react';

/**
 * Admin component for managing premium settings
 * This would typically be accessible only to administrators
 */
const PremiumAdmin: React.FC = () => {
  const [xpub, setXpub] = useState('');
  const [currentXpub, setCurrentXpub] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    loadCurrentXpub();
  }, []);
  
  const loadCurrentXpub = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await window.electron.premium.getXpub();
      
      if (result.success && result.xpub) {
        setCurrentXpub(result.xpub);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load current XPUB');
      console.error('Error loading XPUB:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveXpub = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      if (!xpub.trim()) {
        setError('XPUB key is required');
        return;
      }
      
      // Validate XPUB format (basic check)
      if (!xpub.startsWith('xpub') && !xpub.startsWith('ypub') && !xpub.startsWith('zpub')) {
        setError('Invalid XPUB format. Must start with xpub, ypub, or zpub');
        return;
      }
      
      const result = await window.electron.premium.setXpub({ xpub: xpub.trim() });
      
      if (result.success) {
        setSuccess('XPUB key has been updated successfully');
        await loadCurrentXpub();
        setXpub(''); // Clear the input field
      } else {
        setError(result.error || 'Failed to set XPUB key');
      }
    } catch (err) {
      setError('An error occurred while saving the XPUB key');
      console.error('Error saving XPUB:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
        <div className="flex items-center space-x-2 mb-5">
          <div className="p-2 bg-accent-green/20 rounded-full">
            <Key className="h-5 w-5 text-accent-green" />
          </div>
          <h2 className="text-xl font-semibold text-white">Premium Configuration</h2>
        </div>
        
        <div className="mb-6">
          <div className="text-gray-300 mb-1 font-medium">Current XPUB Key</div>
          <div className="flex items-center p-3 bg-gray-900 border border-gray-700 rounded-lg">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-green"></div>
            ) : currentXpub ? (
              <div className="text-sm font-mono text-gray-400 flex items-center">
                <Lock className="h-4 w-4 mr-2 text-gray-500" />
                {currentXpub}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No XPUB key configured</div>
            )}
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <label htmlFor="xpub" className="text-gray-300 font-medium">
              Set New XPUB Key
            </label>
            {isLoading && (
              <span className="text-gray-500 text-sm flex items-center">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </span>
            )}
          </div>
          <textarea
            id="xpub"
            value={xpub}
            onChange={(e) => setXpub(e.target.value)}
            placeholder="xpub..."
            className="w-full h-24 bg-gray-900 border border-gray-700 focus:border-accent-green/50 focus:ring-1 focus:ring-accent-green/30 rounded-lg p-3 text-sm font-mono text-gray-300 resize-none"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the extended public key (xpub) used for generating Bitcoin addresses
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-lg flex items-start">
            <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-400">{error}</div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded-lg flex items-start">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-400">{success}</div>
          </div>
        )}
        
        <button
          onClick={handleSaveXpub}
          disabled={isLoading || !xpub.trim()}
          className={`w-full flex justify-center items-center space-x-2 p-2.5 rounded-lg ${
            isLoading || !xpub.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-accent-green hover:bg-accent-green/90 text-white'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save XPUB Key</span>
            </>
          )}
        </button>
      </div>
      
      <div className="text-xs text-gray-600 text-center">
        <p>XPUB keys are used for generating deterministic Bitcoin addresses.</p>
        <p>Changes to the XPUB key will affect all future premium payment addresses.</p>
      </div>
    </div>
  );
};

export default PremiumAdmin;