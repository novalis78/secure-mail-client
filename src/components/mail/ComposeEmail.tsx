import { Lock } from 'lucide-react';

const ComposeEmail = () => {
  return (
    <div className="h-full flex flex-col bg-base-dark p-6">
      {/* Email Header */}
      <div className="flex items-center space-x-3 mb-8">
        <Lock className="text-accent-green" size={20} />
        <span className="text-lg font-medium">New Message</span>
      </div>

      {/* Email Form */}
      <div className="flex-1 space-y-6">
        <input
          type="text"
          placeholder="To:"
          className="w-full bg-secondary-dark px-6 py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
        />
        <input
          type="text"
          placeholder="Subject:"
          className="w-full bg-secondary-dark px-6 py-4 rounded-xl focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
        />
        <textarea
          placeholder="Write your message..."
          className="w-full h-96 bg-secondary-dark px-6 py-4 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-accent-green text-gray-100 placeholder-gray-500"
        />
      </div>

      {/* Email Footer */}
      <div className="pt-8">
        <button className="bg-accent-green text-white px-8 py-3 rounded-full hover:bg-accent-green/90 transition-colors text-sm font-medium">
          Send Encrypted
        </button>
      </div>
    </div>
  );
};

export default ComposeEmail;