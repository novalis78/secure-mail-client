interface Mail {
  id: string;
  from: string;
  status: 'NEW' | 'MESSAGE_VIEWED';
  isEncrypted: boolean;
}

const MailList = () => {
  const mails: Mail[] = [
    {
      id: '1',
      from: 'thekeeper@thekeeper.world',
      status: 'NEW',
      isEncrypted: true
    },
    // Add more sample messages
  ];

  return (
    <div className="space-y-2">
      {mails.map(mail => (
        <div 
          key={mail.id}
          className={`p-4 rounded-lg ${
            mail.status === 'NEW' ? 'bg-primary/20' : 'bg-gray-800'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
              {mail.isEncrypted && (
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-white">{mail.from}</p>
              <p className="text-sm text-gray-400">
                {mail.status === 'NEW' ? 'NEW' : 'MESSAGE VIEWED'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MailList;
