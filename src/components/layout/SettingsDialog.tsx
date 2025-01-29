import React, { useState } from 'react';
import { X, Mail, Key, Shield, Usb } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const SettingsDialog = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('email');
  
  const tabs = [
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'keys', label: 'Key Management', icon: Key },
    { id: 'yubikey', label: 'YubiKey', icon: Usb },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-3/4 bg-secondary-dark border border-border-dark">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Settings
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        <div className="flex h-full mt-4">
          {/* Sidebar */}
          <div className="w-48 border-r border-border-dark">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${
                    activeTab === tab.id
                      ? 'bg-accent-green/20 text-accent-green'
                      : 'text-gray-400 hover:bg-hover-dark hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'email' && <EmailSettings />}
            {activeTab === 'keys' && <KeyManagement />}
            {activeTab === 'yubikey' && <YubiKeySettings />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EmailSettings = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-medium text-white">Gmail IMAP Configuration</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Email Address</label>
        <input
          type="email"
          className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
          placeholder="your.email@gmail.com"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-gray-400">App Password</label>
        <input
          type="password"
          className="w-full bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
          placeholder="Gmail App Password"
        />
        <p className="text-xs text-gray-500">
          Use an App Password generated from your Google Account settings
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm text-gray-400">IMAP Settings</label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
            placeholder="imap.gmail.com"
            defaultValue="imap.gmail.com"
          />
          <input
            type="number"
            className="bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
            placeholder="993"
            defaultValue="993"
          />
        </div>
      </div>
      <button className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
        Save Configuration
      </button>
    </div>
  </div>
);

const KeyManagement = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-medium text-white">PGP Key Management</h3>
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Import Public Key</label>
        <textarea
          className="w-full h-32 bg-base-dark border border-border-dark rounded-lg px-4 py-2 text-white"
          placeholder="Paste PGP public key here..."
        />
      </div>
      <button className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
        Import Key
      </button>
      
      <div className="mt-8">
        <h4 className="text-md font-medium text-white mb-4">Stored Keys</h4>
        <div className="space-y-2">
          {/* Example stored key */}
          <div className="bg-base-dark border border-border-dark rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white">alice@example.com</p>
                <p className="text-xs text-gray-400">Fingerprint: 2345 6789 ABCD EFGH</p>
              </div>
              <button className="text-red-500 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const YubiKeySettings = () => (
  <div className="space-y-6">
    <h3 className="text-lg font-medium text-white">YubiKey Configuration</h3>
    <div className="space-y-4">
      <div className="p-4 bg-base-dark border border-border-dark rounded-lg">
        <p className="text-gray-400">Status: No YubiKey detected</p>
      </div>
      <button className="bg-accent-green text-white px-4 py-2 rounded-lg hover:bg-accent-green/90">
        Detect YubiKey
      </button>
      
      <div className="mt-4">
        <h4 className="text-md font-medium text-white mb-2">Options</h4>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input type="checkbox" className="form-checkbox" />
            <span className="text-gray-400">Auto-detect YubiKey on startup</span>
          </label>
        </div>
      </div>
    </div>
  </div>
);

export default SettingsDialog;