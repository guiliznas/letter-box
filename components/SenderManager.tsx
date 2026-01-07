import React, { useState } from 'react';
import { Sender } from '../types';
import { Trash2, Plus } from 'lucide-react';

interface SenderManagerProps {
  senders: Sender[];
  onAddSender: (email: string, name: string) => void;
  onRemoveSender: (email: string) => void;
  onClose: () => void;
}

export const SenderManager: React.FC<SenderManagerProps> = ({ senders, onAddSender, onRemoveSender, onClose }) => {
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail && newName) {
      onAddSender(newEmail, newName);
      setNewEmail('');
      setNewName('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 transition-colors duration-200">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">Manage Senders</h2>
        <button onClick={onClose} className="text-blue-600 dark:text-blue-400 font-medium text-sm">Done</button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {/* Add Form */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 transition-colors duration-200">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Add Newsletter</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Sender Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <input
                type="email"
                placeholder="Sender Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 dark:bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add Sender
            </button>
          </form>
        </div>

        {/* List */}
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Subscribed ({senders.length})</h3>
        <div className="space-y-2">
          {senders.map((sender) => (
            <div key={sender.email} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm transition-colors duration-200">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${sender.avatarColor || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold`}>
                   {sender.name ? sender.name.charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sender.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{sender.email}</p>
                </div>
              </div>
              <button
                onClick={() => onRemoveSender(sender.email)}
                className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                aria-label="Remove sender"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};