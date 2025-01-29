import React, { useState, useEffect } from 'react';
import { Lock, Loader } from 'lucide-react';

interface Mail {
  id: string;
  from: string;
  subject: string;
  status: 'NEW' | 'MESSAGE_VIEWED';
  isEncrypted: boolean;
}

interface MailListProps {
  selectedMailId: string | null;
  onSelectMail: (id: string) => void;
}

const MailList = ({ selectedMailId, onSelectMail }: MailListProps) => {
  const [mails, setMails] = useState<Mail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!(window as any).electron?.imap) {
      setError('IMAP functionality not available');
      return;
    }

    // Set up email listeners
    window.electron.imap.onEmailsFetched((emails: Mail[]) => {
      setMails(emails);
      setIsLoading(false);
    });

    window.electron.imap.onProgress((p: { current: number; total: number }) => {
      setProgress(p);
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
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 p-4 rounded-lg bg-red-500/10">
          {error}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="space-y-2 text-center">
          <Loader className="h-8 w-8 animate-spin text-accent-green" />
          <p className="text-sm text-gray-400">
            Loading emails ({progress.current}/{progress.total})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-base-dark">
      {/* Filter Tabs */}
      <div className="flex items-center px-6 py-4">
        <div className="space-x-8 text-sm">
          <button className="text-accent-green font-medium">All</button>
          <button className="text-gray-400 hover:text-white">Read</button>
          <button className="text-gray-400 hover:text-white">Unread</button>
        </div>
      </div>
      
      {/* Mail List */}
      <div className="space-y-2 px-4">
        {mails.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No encrypted emails found
          </div>
        ) : (
          mails.map(mail => (
            <div
              key={mail.id}
              onClick={() => onSelectMail(mail.id)}
              className={`p-mail-item rounded-xl cursor-pointer transition-colors ${
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
                  <p className={`text-xs mt-1.5 ${
                    mail.status === 'NEW' 
                      ? 'text-accent-green font-medium' 
                      : 'text-gray-400'
                  }`}>
                    {mail.status === 'NEW' ? 'NEW' : 'MESSAGE VIEWED'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MailList;