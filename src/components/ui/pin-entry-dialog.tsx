import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface PinEntryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  title?: string;
  message?: string;
  errorMessage?: string; // Add error message prop
}

export function PinEntryDialog({
  isOpen,
  onClose,
  onSubmit,
  title = "YubiKey PIN Required",
  message = "Please enter your YubiKey PIN to sign this message",
  errorMessage
}: PinEntryDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use a series of attempts to ensure the focus works
      const focusAttempts = [50, 150, 300, 500];
      
      // Function to attempt focusing
      const attemptFocus = (delay: number, attempt: number) => {
        setTimeout(() => {
          try {
            if (inputRef.current) {
              // Both focus and click to ensure mobile browsers show keyboard
              inputRef.current.focus();
              inputRef.current.click();
              
              // Force cursor to show by setting selection range
              const length = inputRef.current.value.length;
              inputRef.current.setSelectionRange(length, length);
              
              console.log(`PIN input focused on attempt ${attempt+1}`);
            }
          } catch (e) {
            console.error(`Failed to focus PIN input on attempt ${attempt+1}:`, e);
            
            // Try again with next delay if available
            if (attempt < focusAttempts.length - 1) {
              attemptFocus(focusAttempts[attempt + 1], attempt + 1);
            }
          }
        }, delay);
      };
      
      // Start first attempt
      attemptFocus(focusAttempts[0], 0);
    }
  }, [isOpen]);

  // Clear pin when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);
  
  // Update error if errorMessage prop changes
  useEffect(() => {
    if (errorMessage) {
      setError(errorMessage);
    }
  }, [errorMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure latest PIN value
    const currentPin = inputRef.current?.value || pin;
    
    if (!currentPin.trim()) {
      setError('PIN is required');
      return;
    }
    
    // Set a timeout to allow any pending input to complete
    // This helps when the user tries to type and immediately submit
    setTimeout(() => {
      // Recheck the current value
      const finalPin = inputRef.current?.value || currentPin;
      console.log('Submitting PIN (length:', finalPin.length, ')');
      onSubmit(finalPin);
    }, 50);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <Dialog.Title className="text-lg font-semibold text-gray-900">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-gray-600">
            {message}
          </Dialog.Description>
          
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-md">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm font-medium text-gray-700">
                PIN
              </label>
              <input
                ref={inputRef}
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError('');
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Enter your YubiKey PIN"
                autoComplete="off"
                autoFocus={true}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Submit
              </button>
            </div>
          </form>
          
          <Dialog.Close asChild>
            <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}