import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import ExportModal from './components/ExportModal';

function App() {
  const [conversations, setConversations] = useState([
    {
      id: '1',
      title: 'Solar Leads Discussion',
      messages: [
        {
          id: '1',
          type: 'bot',
          content: 'Hello! I\'m your lead generation assistant. I can help you generate high-quality leads for any business niche. Just tell me what you need!',
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);

  const [activeConversationId, setActiveConversationId] = useState('1');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState('scraper');
  const sidebarRef = useRef(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Handle Google Auth Success redirect
  useEffect(() => {
    const handleGoogleAuthSuccess = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authDataParam = urlParams.get('authData');

      if (window.location.pathname === '/google-auth-success' && authDataParam) {
        try {
          const authData = JSON.parse(decodeURIComponent(authDataParam));

          // Store auth data persistently
          localStorage.setItem('googleAuthData', JSON.stringify(authData));

          // Send message to opener window (the original tab)
          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              authData: authData
            }, window.location.origin);
            window.close();
          } else {
            // If no opener, store and redirect back to main app
            sessionStorage.setItem('googleAuthData', JSON.stringify(authData));
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Failed to parse auth data:', error);
        }
      }

      // Check if we have stored auth data from redirect
      const storedAuthData = sessionStorage.getItem('googleAuthData');
      if (storedAuthData) {
        sessionStorage.removeItem('googleAuthData');
        try {
          const authData = JSON.parse(storedAuthData);
          // Trigger the Google Sheets export with stored auth data
          window.dispatchEvent(new CustomEvent('googleAuthComplete', { detail: { authData } }));
        } catch (error) {
          console.error('Failed to parse stored auth data:', error);
        }
      }
    };

    handleGoogleAuthSuccess();
  }, []);

  const updateConversation = (conversationId, updates) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, ...updates, updatedAt: new Date() }
          : conv
      )
    );
  };

  const addMessage = (conversationId, message) => {
    const newMessage = {
      ...message,
      id: Date.now().toString(),
    };

    updateConversation(conversationId, {
      messages: [
        ...(conversations.find(c => c.id === conversationId)?.messages || []),
        newMessage
      ]
    });

    return newMessage;
  };

  const createNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [
        {
          id: '1',
          type: 'bot',
          content: 'Hello! I\'m your lead generation assistant. How can I help you generate leads today?',
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
  };

  const deleteConversation = (conversationId) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));

    if (activeConversationId === conversationId) {
      const remaining = conversations.filter(c => c.id !== conversationId);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  };

  const updateConversationTitle = (conversationId, title) => {
    updateConversation(conversationId, { title });
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const newWidth = Math.max(250, Math.min(500, e.clientX));
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  return (
    <div
      className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Sidebar - Fixed height and width */}
      <div
        ref={sidebarRef}
        className="relative flex-shrink-0 bg-white/10 backdrop-blur-lg border-r border-white/20 h-full"
        style={{ width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth }}
      >
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={setActiveConversationId}
          onNewConversation={createNewConversation}
          onDeleteConversation={deleteConversation}
          onUpdateTitle={updateConversationTitle}
        />
        
        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>

      {/* Main Chat Area - Fixed height and proper constraints */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar: Lead Source Selector moved to right */}
        <div className="flex justify-end items-center px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-900 relative z-20">
          {/* Source Selector - moved to right */}
          <div>
            <label className="mr-2 font-semibold text-white">Lead Source:</label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-black"
              style={{ minWidth: 120 }}
            >
              <option value="apify">Apify</option>
              <option value="apollo">Apollo</option>
              <option  value="scraper">Scraper</option>
            </select>
          </div>
        </div>

        {/* Chat Section */}
        {activeConversation ? (
          <Chat
            selectedSource={selectedSource}
            conversation={activeConversation}
            onSendMessage={(content) => addMessage(activeConversation.id, {
              type: 'user',
              content,
              timestamp: new Date()
            })}
            onBotResponse={(content, leads) => addMessage(activeConversation.id, {
              type: 'bot',
              content,
              timestamp: new Date(),
              leads
            })}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white/60">
              <p className="text-xl mb-4">No conversation selected</p>
              <button
                onClick={createNewConversation}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Export Modal */}
      <ExportModal
        leads={leadsData}
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}

export default App;