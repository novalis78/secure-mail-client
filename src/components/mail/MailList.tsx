import { useState, useEffect } from 'react';
import { Lock, Loader, Search, Shield } from 'lucide-react';
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
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

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
    <div className="h-full flex flex-col bg-[#030b1a]">
      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-[#0c1c3d] bg-[#041024]" style={{ boxShadow: 'inset 0 -1px 0 0 rgba(6, 46, 93, 0.2)' }}>
        <div className="relative">
          <div className="absolute inset-y-0 flex items-center pointer-events-none" style={{ left: '1.75rem' }}>
            <Search className="h-3.5 w-3.5 text-[#526583]" />
          </div>
          <input
            type="search"
            placeholder="Search secure emails..."
            className="w-full bg-[#041024] text-white pl-12 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#12d992]/30 border border-[#0c1c3d] placeholder-[#526583] text-xs"
            style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.15)' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex items-center px-5 py-3 border-b border-[#0c1c3d] bg-[#041024]/70">
        <div className="flex space-x-2">
          <button 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeFilter === 'all' 
                ? "bg-[#12d992] text-[#030b1a] shadow-[0_0_10px_rgba(18,217,146,0.3)]" 
                : "bg-[#0c1c3d] text-[#c1d1f7] hover:bg-[#122c54] hover:text-white"
            }`}
            onClick={() => setActiveFilter('all')}
            style={activeFilter === 'all' ? { textShadow: '0 1px 0 rgba(0, 0, 0, 0.1)' } : {}}
          >
            All
          </button>
          <button 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeFilter === 'read' 
                ? "bg-[#12d992] text-[#030b1a] shadow-[0_0_10px_rgba(18,217,146,0.3)]" 
                : "bg-[#0c1c3d] text-[#c1d1f7] hover:bg-[#122c54] hover:text-white"
            }`}
            onClick={() => setActiveFilter('read')}
            style={activeFilter === 'read' ? { textShadow: '0 1px 0 rgba(0, 0, 0, 0.1)' } : {}}
          >
            Read
          </button>
          <button 
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              activeFilter === 'unread' 
                ? "bg-[#12d992] text-[#030b1a] shadow-[0_0_10px_rgba(18,217,146,0.3)]" 
                : "bg-[#0c1c3d] text-[#c1d1f7] hover:bg-[#122c54] hover:text-white"
            }`}
            onClick={() => setActiveFilter('unread')}
            style={activeFilter === 'unread' ? { textShadow: '0 1px 0 rgba(0, 0, 0, 0.1)' } : {}}
          >
            Unread
          </button>
        </div>
      </div>
      
      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4 bg-[#030b1a] border-b border-[#0c1c3d]" style={{ boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)' }}>
          <div className="flex items-center space-x-2">
            <Loader className="h-4 w-4 animate-spin text-[#12d992]" style={{ filter: 'drop-shadow(0 0 3px rgba(18, 217, 146, 0.3))' }} />
            <p className="text-xs text-[#c1d1f7]" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>
              Loading emails ({progress.current}/{progress.total})
            </p>
          </div>
        </div>
      )}
      
      {/* Mail List */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#030b1a', backgroundImage: 'linear-gradient(to bottom, #041024 0%, #030b1a 100px)' }}>
        <div className="space-y-0.5 p-2">
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center h-64">
              <div className="text-[#12d992] mb-5 relative">
                <Lock size={48} className="opacity-70" style={{ filter: 'drop-shadow(0 0 8px rgba(18, 217, 146, 0.15))' }} />
                <div className="absolute inset-0 flex items-center justify-center animate-pulse duration-3000">
                  <Lock size={32} style={{ filter: 'drop-shadow(0 0 10px rgba(18, 217, 146, 0.25))' }} />
                </div>
              </div>
              <p className="text-[#c1d1f7] font-medium text-sm mb-1" style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' }}>No secure messages found</p>
              <p className="text-[#526583] text-xs max-w-xs">
                {searchQuery 
                  ? "No messages match your current search filters" 
                  : "Your secure inbox is empty or messages still loading"}
              </p>
              <div className="mt-8 pt-6 border-t border-[#0c1c3d] w-32 flex justify-center">
                <Shield size={18} className="text-[#0d2146]" style={{ opacity: 0.7 }} />
              </div>
            </div>
          ) : (
            filteredEmails.map(mail => (
              <div
                key={mail.id}
                onClick={() => onSelectMail(mail.id)}
                onMouseEnter={() => setHoveredItemId(mail.id)}
                onMouseLeave={() => setHoveredItemId(null)}
                className={`p-3 my-1.5 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedMailId === mail.id
                    ? 'bg-gradient-to-r from-[#12d992]/20 to-[#0c1c3d]/80 border-l-2 border-[#12d992] shadow-[0_2px_12px_rgba(12,28,61,0.5)]'
                    : mail.status === 'NEW'
                    ? 'bg-[#0c1c3d]/70 border-l-2 border-[#f3c677] hover:bg-[#0c1c3d] hover:translate-x-0.5'
                    : hoveredItemId === mail.id
                    ? 'bg-[#0c1c3d]/50 hover:translate-x-0.5 shadow-[0_2px_8px_rgba(12,28,61,0.3)]'
                    : 'bg-[#041024]/30 hover:bg-[#0c1c3d]/50 hover:translate-x-0.5'
                }`}
                style={selectedMailId === mail.id ? {
                  boxShadow: '0 2px 15px rgba(12, 28, 61, 0.5), inset 0 1px 0 0 rgba(193, 209, 247, 0.05)'
                } : {}}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mt-1 ${
                      selectedMailId === mail.id 
                        ? 'bg-[#12d992]/20' 
                        : mail.status === 'NEW'
                        ? 'bg-[#f3c677]/10'
                        : hoveredItemId === mail.id
                        ? 'bg-[#0c1c3d]'
                        : 'bg-[#0c1c3d]/60'
                    }`}
                    style={selectedMailId === mail.id ? {
                      boxShadow: 'inset 0 0 0 1px rgba(18, 217, 146, 0.2), 0 0 10px rgba(18, 217, 146, 0.15)'
                    } : mail.status === 'NEW' ? {
                      boxShadow: 'inset 0 0 0 1px rgba(243, 198, 119, 0.2), 0 0 10px rgba(243, 198, 119, 0.05)'
                    } : hoveredItemId === mail.id ? {
                      boxShadow: 'inset 0 0 0 1px rgba(12, 28, 61, 1), 0 0 5px rgba(12, 28, 61, 0.5)'
                    } : {}}
                    >
                      {/* Alternate between Lock and Shield icons for more variation */}
                      {mail.id.charCodeAt(0) % 2 === 0 ? (
                        <Lock className={`h-5 w-5 ${
                          selectedMailId === mail.id 
                            ? 'text-[#12d992]' 
                            : mail.status === 'NEW'
                            ? 'text-[#f3c677]'
                            : hoveredItemId === mail.id
                            ? 'text-[#c1d1f7]'
                            : 'text-[#526583]'
                        }`} 
                        style={selectedMailId === mail.id ? {
                          filter: 'drop-shadow(0 0 3px rgba(18, 217, 146, 0.3))'
                        } : mail.status === 'NEW' ? {
                          filter: 'drop-shadow(0 0 3px rgba(243, 198, 119, 0.2))'
                        } : {}}
                        />
                      ) : (
                        <Shield className={`h-5 w-5 ${
                          selectedMailId === mail.id 
                            ? 'text-[#12d992]' 
                            : mail.status === 'NEW'
                            ? 'text-[#f3c677]'
                            : hoveredItemId === mail.id
                            ? 'text-[#c1d1f7]'
                            : 'text-[#526583]'
                        }`}
                        style={selectedMailId === mail.id ? {
                          filter: 'drop-shadow(0 0 3px rgba(18, 217, 146, 0.3))'
                        } : mail.status === 'NEW' ? {
                          filter: 'drop-shadow(0 0 3px rgba(243, 198, 119, 0.2))'
                        } : {}}
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden w-full pr-2">
                    <div className="space-y-1.5">
                      <p className={`text-xs font-medium tracking-wide ${
                        selectedMailId === mail.id 
                          ? 'text-white' 
                          : hoveredItemId === mail.id
                          ? 'text-[#c1d1f7]'
                          : 'text-[#c1d1f7]/80'
                      }`}
                      style={selectedMailId === mail.id ? {
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                      } : {}}
                      >{mail.from.length > 25 ? mail.from.substring(0, 25) + '...' : mail.from}</p>
                      
                      <p className={`text-xs font-medium ${
                        selectedMailId === mail.id 
                          ? 'text-[#c1d1f7]/90' 
                          : hoveredItemId === mail.id
                          ? 'text-[#c1d1f7]/70'
                          : 'text-[#526583]'
                      }`}
                      style={selectedMailId === mail.id ? {
                        textShadow: '0 1px 1px rgba(0, 0, 0, 0.1)'
                      } : {}}
                      >{mail.subject}</p>
                    </div>
                    {/* Status badges row */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {mail.status === 'NEW' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#f3c677]/10 text-[#f3c677] border border-[#f3c677]/20"
                        style={{
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}>
                          New
                        </span>
                      ) : (
                        <span className="text-[#526583]/80 text-xs flex items-center space-x-1">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>Read</span>
                        </span>
                      )}
                      
                      {mail.folder && mail.folder !== 'INBOX' && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium 
                          ${mail.folder === 'SENT' ? 'bg-[#12d992]/10 text-[#12d992] border border-[#12d992]/20' :
                            mail.folder === 'DRAFT' ? 'bg-[#6b7280]/10 text-[#9ca3af] border border-[#6b7280]/20' :
                            'bg-[#6b7280]/10 text-[#9ca3af] border border-[#6b7280]/20'}`}
                        style={{
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                        }}>
                          {mail.folder}
                        </span>
                      )}
                    </div>
                    
                    {/* Date row */}
                    <div className="flex justify-end w-full mt-2">
                      <div className="text-[9px] text-[#526583]/70 bg-[#0c1c3d]/30 px-2 py-0.5 rounded-sm">
                        {mail.date 
                          ? new Date(mail.date instanceof Date ? mail.date : new Date(mail.date)).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric'
                            })
                          : ''}
                      </div>
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