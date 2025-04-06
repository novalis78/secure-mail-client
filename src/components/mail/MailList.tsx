import { useState, useEffect } from 'react';
import { Lock, Loader, Search } from 'lucide-react';
import { Mail } from '../../App';

interface MailListProps {
  emails?: Mail[];
  selectedMailId: string | null;
  onSelectMail: (id: string) => void;
}

const MailList = ({ emails = [], selectedMailId, onSelectMail }: MailListProps) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!(window as any).electron?.imap) {
      setError('IMAP functionality not available');
      return;
    }

    window.electron.imap.onProgress((p: { current: number; total: number }) => {
      setProgress(p);
      setIsLoading(true);
    });

    window.electron.imap.onError((errorMsg: string) => {
      setError(errorMsg);
      setIsLoading(false);
    });

    window.electron.imap.onConnected(() => {
      setIsLoading(true);
      setError(null);
    });

    window.electron.imap.onDisconnected(() => {
      setIsLoading(false);
    });

    window.electron.imap.onEmailsFetched(() => {
      setIsLoading(false);
    });
  }, []);

  // Filter emails based on active filter and search query
  const filteredEmails = emails.filter(email => {
    const matchesFilter = 
      activeFilter === 'all' || 
      (activeFilter === 'read' && email.status === 'MESSAGE_VIEWED') || 
      (activeFilter === 'unread' && email.status === 'NEW');
    
    const matchesSearch = 
      !searchQuery || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.from.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 p-4 rounded-lg bg-red-500/10">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base-dark">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-border-dark">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="search"
            placeholder="Search secure emails..."
            className="w-full bg-secondary-dark text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none placeholder-gray-400 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex items-center px-6 py-3 border-b border-border-dark">
        <div className="space-x-8 text-sm">
          <button 
            className={activeFilter === 'all' ? "text-accent-green font-medium" : "text-gray-400 hover:text-white"}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={activeFilter === 'read' ? "text-accent-green font-medium" : "text-gray-400 hover:text-white"}
            onClick={() => setActiveFilter('read')}
          >
            Read
          </button>
          <button 
            className={activeFilter === 'unread' ? "text-accent-green font-medium" : "text-gray-400 hover:text-white"}
            onClick={() => setActiveFilter('unread')}
          >
            Unread
          </button>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-base-dark border-b border-border-dark">
          <div className="flex items-center space-x-2">
            <Loader className="h-4 w-4 animate-spin text-accent-green" />
            <p className="text-xs text-gray-400">
              Loading emails ({progress.current}/{progress.total})
            </p>
          </div>
        </div>
      )}
      
      {/* Mail List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-px p-2">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchQuery 
                ? "No matching encrypted emails found" 
                : "No encrypted emails found"}
            </div>
          ) : (
            filteredEmails.map(mail => (
              <div
                key={mail.id}
                onClick={() => onSelectMail(mail.id)}
                className={`p-3 rounded-xl cursor-pointer transition-colors ${
                  selectedMailId === mail.id
                    ? 'bg-accent-green/10'
                    : mail.status === 'NEW'
                    ? 'bg-secondary-dark'
                    : 'hover:bg-hover-dark'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
                      {mail.isEncrypted && (
                        <Lock className="h-5 w-5 text-accent-green" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-100 font-mono">{mail.from}</p>
                    <p className="text-sm text-gray-400 truncate">{mail.subject}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-xs ${
                        mail.status === 'NEW' 
                          ? 'text-accent-green font-medium' 
                          : 'text-gray-400'
                      }`}>
                        {mail.status === 'NEW' ? 'NEW' : 'MESSAGE VIEWED'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {mail.date 
                          ? new Date(mail.date instanceof Date ? mail.date : new Date(mail.date)).toLocaleDateString() 
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MailList;