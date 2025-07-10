import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import ExportModal from './components/ExportModal.jsx';
import LeadsTable from './components/LeadsTable.jsx';
import EmailSection from './components/EmailSender';

function App() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [emailLeads, setEmailLeads] = useState([]);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState('scraper');
  const [screen, setScreen] = useState('chat');
  const sidebarRef = useRef(null);

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  useEffect(() => {
    const stored = localStorage.getItem('conversations');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Keep leads data on app restart - don't clear them
      setConversations(parsed);
      setActiveConversationId(parsed[0]?.id || null);

      // Restore leads data from the latest conversation with leads
      const latestConversationWithLeads = parsed.find(conv =>
        conv.messages && conv.messages.some(msg => msg.leads && msg.leads.length > 0)
      );

      if (latestConversationWithLeads) {
        const latestMessageWithLeads = latestConversationWithLeads.messages
          .reverse()
          .find(msg => msg.leads && msg.leads.length > 0);

        if (latestMessageWithLeads && latestMessageWithLeads.leads) {
          setLeadsData(latestMessageWithLeads.leads);
        }
      }
    } else {
      createNewConversation();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

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
    const updated = conversations.filter(c => c.id !== conversationId);
    setConversations(updated);
    if (activeConversationId === conversationId) {
      setActiveConversationId(updated[0]?.id || null);
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

  useEffect(() => {
    const handleGoogleAuthSuccess = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authDataParam = urlParams.get('authData');

      if (window.location.pathname === '/google-auth-success' && authDataParam) {
        try {
          const authData = JSON.parse(decodeURIComponent(authDataParam));
          localStorage.setItem('googleAuthData', JSON.stringify(authData));

          if (window.opener) {
            window.opener.postMessage({
              type: 'GOOGLE_AUTH_SUCCESS',
              authData: authData
            }, window.location.origin);
            window.close();
          } else {
            sessionStorage.setItem('googleAuthData', JSON.stringify(authData));
            window.location.href = '/';
          }
        } catch (error) {
          console.error('Failed to parse auth data:', error);
        }
      }

      const storedAuthData = sessionStorage.getItem('googleAuthData');
      if (storedAuthData) {
        sessionStorage.removeItem('googleAuthData');
        try {
          const authData = JSON.parse(storedAuthData);
          window.dispatchEvent(new CustomEvent('googleAuthComplete', { detail: { authData } }));
        } catch (error) {
          console.error('Failed to parse stored auth data:', error);
        }
      }
    };

    handleGoogleAuthSuccess();
  }, []);

  return (
    <div
      className="flex h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
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
          onChangeScreen={setScreen}
        />
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400/50 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar: only show on 'lead' screen */}
        {screen === 'chat' && (
          <div className="flex justify-end items-center px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-900 relative z-20">
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
                <option value="scraper">Scraper</option>
              </select>
            </div>
          </div>
        )}

        {screen === 'chat' && activeConversation && (
          <Chat
            selectedSource={selectedSource}
            conversation={activeConversation}
            onSendMessage={(content) => addMessage(activeConversation.id, {
              type: 'user',
              content,
              timestamp: new Date()
            })}
            onBotResponse={(content, leads) => {
              setLeadsData(leads || []);
              addMessage(activeConversation.id, {
                type: 'bot',
                content,
                timestamp: new Date(),
                leads
              });
            }}
            onSendEmails={(leads) => {
              setEmailLeads(leads);
              setScreen('email');
            }}
          />
        )}

        {screen === 'lead' && <LeadsTable />}
        {screen === 'email' && <EmailSection scrapedLeads={emailLeads} goBack={() => setScreen('chat')} />}
      </div>

      <ExportModal
        leads={leadsData}
        isOpen={isExportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />
    </div>
  );
}

export default App;
