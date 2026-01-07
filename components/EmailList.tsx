import React from 'react';
import { EmailItem } from '../types';
import { MailOpen } from 'lucide-react';

interface EmailListProps {
  emails: EmailItem[];
  onSelectEmail: (id: string) => void;
  filterUnread: boolean;
  onToggleFilter: () => void;
}

export const EmailList: React.FC<EmailListProps> = ({ emails, onSelectEmail, filterUnread, onToggleFilter }) => {
  
  const filteredEmails = filterUnread ? emails.filter(e => !e.isRead) : emails;

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      {/* Search / Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Inbox</h1>
        <button 
          onClick={onToggleFilter}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            filterUnread 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {filterUnread ? 'Unread Only' : 'All Emails'}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white dark:bg-gray-900">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-600">
            <MailOpen className="w-12 h-12 mb-2 opacity-20" />
            <p>No emails found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {filteredEmails.map((email) => (
              <button
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800 flex gap-3 ${
                  !email.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-900'
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm ${email.avatarColor || 'bg-gray-400'}`}>
                  {email.senderName ? email.senderName.charAt(0).toUpperCase() : '?'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`truncate text-sm ${!email.isRead ? 'font-bold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                      {email.senderName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2 whitespace-nowrap">
                      {formatDate(email.receivedAt)}
                    </span>
                  </div>
                  <h3 className={`text-sm truncate mb-0.5 ${!email.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                    {email.subject}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {email.bodyText}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};