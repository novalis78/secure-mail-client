import React, { useState, useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from 'lucide-react';

interface OAuthCodePromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string) => void;
}

const OAuthCodePrompt: React.FC<OAuthCodePromptProps> = ({ isOpen, onClose, onSubmit }) => {
  const [code, setCode] = useState('');

  useEffect(() => {
    // Reset code when dialog opens
    if (isOpen) {
      setCode('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(code.trim());
    }
  };

  const handleCancel = () => {
    // Send cancellation event to main process
    if (window.electron?.oauth) {
      window.electron.oauth.cancelAuthCode();
    }
    onClose();
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border border-border-dark bg-secondary-dark p-4 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="text-sm font-medium text-white">
                Enter Authorization Code
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-100 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <p className="text-[11px] text-gray-300">
              Please enter the authorization code from Google. After authorizing in your browser,
              you will be given a code to paste here.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Authorization Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter the code from Google..."
                  className="w-full bg-base-dark border border-border-dark rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-accent-green"
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-700 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!code.trim()}
                  className={`bg-accent-green text-white px-3 py-1.5 rounded-lg hover:bg-accent-green/90 text-xs ${
                    !code.trim() ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Submit Code
                </button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default OAuthCodePrompt;