import React, { useState } from 'react';
import { Plus, MessageSquare, Edit3, Trash2, Check, X, MailIcon, SearchIcon } from 'lucide-react';

const Sidebar = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onUpdateTitle,
  onChangeScreen
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const startEditing = (conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveEdit = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (date) => {
    const now = new Date();
    const parsedDate = new Date(date);
    const diff = now.getTime() - parsedDate.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold text-white mb-4">Lead Generator</h1>
        <div className="flex flex-row items-center space-x-2 mb-2">
          {/* Lead Button */}
          <button
            onClick={() => {onChangeScreen('lead'); onChangeScreen('chat')}}
            className="p-1 hover:bg-blue-500 rounded flex items-center justify-center"
            title="Leads"
          >
            <SearchIcon size={19} />
          </button>
          {/* Email Icon */}
          <button
            onClick={() => onChangeScreen('email')}
            className="p-1 hover:bg-blue-500 rounded flex items-center justify-center"
            title="Email"
          >
            <MailIcon size={19} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={()=>{onNewConversation(); onChangeScreen('chat')}}
            className="bg-blue-600 text-white p-2 rounded w-full text-center transition-all duration-200 hover:scale-[1.02]"
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
        <h2 className="text-sm font-medium text-white/60 mb-3 uppercase tracking-wide">
          Conversations
        </h2>
        
        {conversations?.map((conversation) => (
          <div
            key={conversation.id}
            
            className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
              activeConversationId === conversation.id
                ? 'bg-blue-600/20 border border-blue-400/30'
                : 'bg-white/5 hover:bg-white/10 border border-transparent'
            }`}
            onClick={() => {onConversationSelect(conversation.id);onChangeScreen('chat')}}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-1 p-1.5 rounded-full ${
                activeConversationId === conversation.id
                  ? 'bg-blue-400/20'
                  : 'bg-white/10'
              }`}>
                <MessageSquare size={14} className="text-white/70" />
              </div>
              
              <div className="flex-1 min-w-0">
                {editingId === conversation.id ? (
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-white/10 border border-white/20 rounded text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveEdit();
                      }}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 className="font-medium text-white text-sm mb-1 truncate">
                    {conversation.title}
                  </h3>
                )}
                
                <p className="text-xs text-white/50 mb-1">
                  {formatDate(conversation.updatedAt)}
                </p>
                
                <p className="text-xs text-white/40 truncate">
                  {conversation.messages[conversation.messages.length - 1]?.content || 'No messages'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(conversation);
                }}
                className="p-1.5 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded transition-colors"
                title="Edit title"
              >
                <Edit3 size={12} />
              </button>
              
              {conversations.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 rounded transition-colors"
                  title="Delete conversation"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">
          AI Lead Generation Assistant
        </p>
      </div> */}
    </div>
  );
};

export default Sidebar;