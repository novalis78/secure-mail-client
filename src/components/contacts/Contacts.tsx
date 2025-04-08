import { useState } from 'react';
import { X, Plus, Search, ExternalLink, Lock, Copy, Key, RefreshCw, Shield, Mail, AlertCircle, Globe } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  publicKey: string;
  lastUsed?: Date;
  keyFingerprint: string;
  keyStatus: 'valid' | 'expired' | 'revoked' | 'unknown';
  keyExpiry?: Date;
  trustLevel: 'ultimate' | 'full' | 'marginal' | 'unknown' | 'never';
  source: 'manual' | 'received' | 'keyserver' | 'imported';
}

interface ContactsProps {
  onClose: () => void;
}

const Contacts = ({ onClose }: ContactsProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'grid' | 'table'>('grid');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  
  // Mock data for the prototype
  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGRpE8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      lastUsed: new Date('2025-03-15'),
      keyFingerprint: 'ABCD 1234 EFGH 5678 IJKL 9012 MNOP 3456 QRST 7890',
      keyStatus: 'valid',
      keyExpiry: new Date('2027-04-01'),
      trustLevel: 'full',
      source: 'received'
    },
    {
      id: '2',
      name: 'Bob Johnson',
      email: 'bob@securemail.org',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGTzX8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      lastUsed: new Date('2025-04-01'),
      keyFingerprint: 'WXYZ 9876 VUTS 5432 RQPO 1098 NMLK 7654 JIHG 3210',
      keyStatus: 'valid',
      keyExpiry: new Date('2026-04-01'),
      trustLevel: 'ultimate',
      source: 'manual'
    },
    {
      id: '3',
      name: 'Carol Davis',
      email: 'carol@privacy.net',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGXxC8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      keyFingerprint: 'LMNO 5678 PQRS 1234 TUVW 9012 XYZA 3456 BCDE 7890',
      keyStatus: 'valid',
      trustLevel: 'marginal',
      source: 'keyserver'
    },
    {
      id: '4',
      name: 'David Wilson',
      email: 'david@cryptomail.com',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGVqB8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      keyFingerprint: 'FGHI 9012 JKLM 3456 NOPQ 7890 RSTU 1234 VWXY 5678',
      keyStatus: 'expired',
      keyExpiry: new Date('2024-12-31'),
      trustLevel: 'full',
      source: 'imported'
    },
    {
      id: '5',
      name: 'Eve Anderson',
      email: 'eve@secure-messaging.io',
      publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGSbD8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      keyFingerprint: 'UVWX 5678 YZAB 1234 CDEF 9012 GHIJ 3456 KLMN 7890',
      keyStatus: 'revoked',
      trustLevel: 'never',
      source: 'keyserver'
    }
  ]);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      contact.keyFingerprint.toLowerCase().replace(/\s/g, '').includes(searchLower.replace(/\s/g, ''))
    );
  });

  // Mock function to lookup a key on a keyserver
  const lookupKeyOnServer = async (email: string) => {
    setIsLoading(true);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    
    // Mock result (would come from an actual keyserver in real implementation)
    return {
      found: Math.random() > 0.3, // 70% chance of finding a key
      key: '-----BEGIN PGP PUBLIC KEY BLOCK-----\nVersion: OpenPGP.js v4.10.10\nComment: https://openpgpjs.org\n\nmQINBGNeWw8YBEAC8YgUj8fJfOsZ...\n-----END PGP PUBLIC KEY BLOCK-----',
      fingerprint: generateMockFingerprint()
    };
  };

  // Helper function to generate a mock fingerprint
  function generateMockFingerprint() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let fingerprint = '';
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 4; j++) {
        fingerprint += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (i < 9) fingerprint += ' ';
    }
    return fingerprint;
  }

  // Get status badge style based on key status
  const getStatusBadgeStyle = (status: Contact['keyStatus']) => {
    switch (status) {
      case 'valid':
        return 'bg-green-500/20 text-green-400';
      case 'expired':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'revoked':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Get trust level badge style
  const getTrustBadgeStyle = (trust: Contact['trustLevel']) => {
    switch (trust) {
      case 'ultimate':
        return 'bg-blue-500/20 text-blue-400';
      case 'full':
        return 'bg-green-500/20 text-green-400';
      case 'marginal':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'never':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-secondary-dark">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-dark">
        <div className="flex items-center space-x-2">
          <Globe size={20} className="text-accent-green" />
          <h2 className="text-lg font-medium text-white">Contacts & Keys</h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Side - Contacts List */}
        <div className="w-3/4 flex flex-col border-r border-border-dark h-full">
          {/* Search and Actions */}
          <div className="p-4 border-b border-border-dark flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search contacts, emails, or key fingerprints"
                className="w-full pl-10 pr-4 py-2 bg-input-dark text-white rounded-lg border border-border-dark focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center ml-4 space-x-2">
              <button 
                onClick={() => setActiveTab('grid')}
                className={`p-2 rounded-lg ${activeTab === 'grid' ? 'bg-accent-green/20 text-accent-green' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <div className="grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                </div>
              </button>
              <button 
                onClick={() => setActiveTab('table')}
                className={`p-2 rounded-lg ${activeTab === 'table' ? 'bg-accent-green/20 text-accent-green' : 'text-gray-400 hover:text-gray-300'}`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                  <div className="w-4 h-1 bg-current rounded-sm"></div>
                </div>
              </button>
              <button 
                onClick={() => setShowAddContact(true)}
                className="ml-2 bg-accent-green/90 hover:bg-accent-green text-white px-3 py-2 rounded-lg flex items-center space-x-1 text-sm font-medium"
              >
                <Plus size={16} />
                <span>Add Contact</span>
              </button>
            </div>
          </div>

          {/* Contacts List - Grid View */}
          {activeTab === 'grid' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map(contact => (
                  <div 
                    key={contact.id}
                    className={`bg-base-dark rounded-lg p-4 border border-border-dark cursor-pointer transition-all hover:border-accent-green/30 hover:shadow-md ${selectedContact?.id === contact.id ? 'ring-2 ring-accent-green/70 border-transparent' : ''}`}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-medium truncate">{contact.name}</h3>
                        <p className="text-gray-400 text-sm truncate">{contact.email}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`text-xs rounded-full px-2 py-0.5 ${getStatusBadgeStyle(contact.keyStatus)}`}>
                          {contact.keyStatus}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <Key size={12} className="mr-1" />
                      <span className="font-mono truncate">{contact.keyFingerprint.substring(0, 19)}...</span>
                    </div>
                    <div className="mt-2 flex justify-between items-center">
                      <div className={`text-xs rounded-full px-2 py-0.5 ${getTrustBadgeStyle(contact.trustLevel)}`}>
                        {contact.trustLevel}
                      </div>
                      <span className="text-xs text-gray-500">
                        {contact.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contacts List - Table View */}
          {activeTab === 'table' && (
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-border-dark">
                <thead className="bg-base-dark">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Key Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Trust</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-secondary-dark divide-y divide-border-dark">
                  {filteredContacts.map(contact => (
                    <tr 
                      key={contact.id} 
                      className={`hover:bg-hover-dark cursor-pointer ${selectedContact?.id === contact.id ? 'bg-hover-dark' : ''}`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{contact.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">{contact.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(contact.keyStatus)}`}>
                          {contact.keyStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTrustBadgeStyle(contact.trustLevel)}`}>
                          {contact.trustLevel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {contact.source}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side - Details Panel */}
        <div className="w-1/4 p-4 bg-base-dark overflow-y-auto">
          {selectedContact ? (
            <div className="h-full flex flex-col">
              <div className="border-b border-border-dark pb-4 mb-4">
                <h3 className="text-lg font-medium text-white mb-2">{selectedContact.name}</h3>
                <div className="flex items-center text-gray-400 mb-2">
                  <Mail size={16} className="mr-2" />
                  <span>{selectedContact.email}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <div className={`text-xs rounded-full px-2 py-1 ${getStatusBadgeStyle(selectedContact.keyStatus)}`}>
                    <div className="flex items-center gap-1">
                      <Shield size={12} />
                      <span>{selectedContact.keyStatus}</span>
                    </div>
                  </div>
                  <div className={`text-xs rounded-full px-2 py-1 ${getTrustBadgeStyle(selectedContact.trustLevel)}`}>
                    <div className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>{selectedContact.trustLevel}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Key Information</h4>
                  <div className="bg-secondary-dark rounded-lg p-3 border border-border-dark">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400">Fingerprint</span>
                      <button className="text-accent-green hover:text-accent-green/80">
                        <Copy size={14} />
                      </button>
                    </div>
                    <p className="text-xs font-mono text-white break-all mb-4">{selectedContact.keyFingerprint}</p>

                    {selectedContact.keyExpiry && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-400">Expiry Date</span>
                        <p className="text-xs text-white">
                          {selectedContact.keyExpiry.toLocaleDateString()} 
                          {new Date() > selectedContact.keyExpiry && (
                            <span className="ml-1 text-red-400 flex items-center space-x-1">
                              <AlertCircle size={12} />
                              <span>Expired</span>
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="mb-2">
                      <span className="text-xs text-gray-400">Source</span>
                      <p className="text-xs text-white capitalize">{selectedContact.source}</p>
                    </div>

                    {selectedContact.lastUsed && (
                      <div>
                        <span className="text-xs text-gray-400">Last Used</span>
                        <p className="text-xs text-white">{selectedContact.lastUsed.toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-300">Public Key</h4>
                    <button className="text-accent-green hover:text-accent-green/80 text-xs flex items-center space-x-1">
                      <Copy size={12} />
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="bg-secondary-dark rounded-lg p-3 border border-border-dark overflow-hidden">
                    <pre className="text-xs font-mono text-white whitespace-pre-wrap break-all h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                      {selectedContact.publicKey}
                    </pre>
                  </div>
                </div>

                <div className="flex space-x-2 mt-6">
                  <button className="flex-1 bg-accent-green/90 hover:bg-accent-green text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center">
                    <Mail size={16} className="mr-2" />
                    Compose Email
                  </button>
                  <button className="flex items-center justify-center p-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg">
                    <RefreshCw size={16} />
                  </button>
                  <button className="flex items-center justify-center p-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <div className="w-16 h-16 bg-secondary-dark/50 rounded-full flex items-center justify-center mb-4">
                <Key size={24} className="text-gray-400" />
              </div>
              <h3 className="text-white font-medium mb-2">No Contact Selected</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-xs">Select a contact to view their details and public key information</p>
              <button 
                onClick={() => setShowAddContact(true)}
                className="bg-gray-700/70 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm"
              >
                <Plus size={16} />
                <span>Add New Contact</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-secondary-dark rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Add New Contact</h3>
              <button 
                onClick={() => setShowAddContact(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input 
                  type="text" 
                  className="w-full p-2 bg-input-dark text-white rounded-lg border border-border-dark focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 outline-none"
                  placeholder="Contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <div className="flex space-x-2">
                  <input 
                    type="email" 
                    className="flex-1 p-2 bg-input-dark text-white rounded-lg border border-border-dark focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 outline-none"
                    placeholder="email@example.com"
                  />
                  <button 
                    className="bg-blue-500/30 text-blue-400 hover:bg-blue-500/40 px-3 py-2 rounded-lg flex items-center space-x-1 text-sm flex-shrink-0"
                    onClick={() => lookupKeyOnServer('test@example.com')}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <>
                        <Search size={16} />
                        <span>Lookup</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">We'll search public keyservers for this email address</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Public Key</label>
                <textarea 
                  className="w-full p-2 bg-input-dark text-white rounded-lg border border-border-dark focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 outline-none font-mono text-xs h-32"
                  placeholder="Paste PGP public key here"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Trust Level</label>
                <select className="w-full p-2 bg-input-dark text-white rounded-lg border border-border-dark focus:ring-2 focus:ring-accent-green/30 focus:border-accent-green/50 outline-none">
                  <option value="unknown">Unknown</option>
                  <option value="never">Never</option>
                  <option value="marginal">Marginal</option>
                  <option value="full">Full</option>
                  <option value="ultimate">Ultimate</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button 
                  className="px-4 py-2 text-gray-300 hover:text-white bg-transparent rounded-lg text-sm"
                  onClick={() => setShowAddContact(false)}
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-accent-green/90 hover:bg-accent-green text-white rounded-lg text-sm font-medium">
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
