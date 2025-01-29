"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lucide_react_1 = require("lucide-react");
const MailList = ({ selectedMailId, onSelectMail }) => {
    const mails = [
        {
            id: '1',
            from: 'thekeeper@thekeeper.world',
            status: 'NEW',
            isEncrypted: true
        },
        {
            id: '2',
            from: 'thekeeper@thekeeper.world',
            status: 'MESSAGE_VIEWED',
            isEncrypted: true
        }
    ];
    return (<div className="h-full bg-base-dark">
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
        {mails.map(mail => (<div key={mail.id} onClick={() => onSelectMail(mail.id)} className={`p-mail-item rounded-xl cursor-pointer transition-colors ${selectedMailId === mail.id
                ? 'bg-accent-green/10'
                : mail.status === 'NEW'
                    ? 'bg-secondary-dark'
                    : 'hover:bg-hover-dark'}`}>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
                  {mail.isEncrypted && (<lucide_react_1.Lock className="h-5 w-5 text-accent-green"/>)}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-100 font-mono">{mail.from}</p>
                <p className={`text-xs mt-1.5 ${mail.status === 'NEW'
                ? 'text-accent-green font-medium'
                : 'text-gray-400'}`}>
                  {mail.status === 'NEW' ? 'NEW' : 'MESSAGE VIEWED'}
                </p>
              </div>
            </div>
          </div>))}
      </div>
    </div>);
};
exports.default = MailList;
//# sourceMappingURL=MailList.js.map