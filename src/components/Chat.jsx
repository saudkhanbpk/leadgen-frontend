import React, { useEffect, useRef, useState } from "react";
import { fetchLeads } from "../api/index";
import MessageBubble from "./MessageBubble";

const Chat = ({ selectedSource, conversation, onSendMessage, onBotResponse }) => {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(selectedSource || 'apify');
  const [progress, setProgress] = useState({ show: false, message: '', percent: 0, leadsFound: 0 });
  const messagesEndRef = useRef(null);

  // Use messages from conversation prop
  const messages = conversation?.messages || [];

  useEffect(() => {
    setSource(selectedSource);
  }, [selectedSource]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    console.log(`\n🚀 ===== FRONTEND CHAT DEBUG =====`);
    console.log(`⏰ Send triggered at: ${new Date().toISOString()}`);
    console.log(`📝 User input: "${userInput}"`);
    console.log(`🎯 Selected source: "${source}"`);

    if (!userInput.trim()) {
      console.log(`❌ Empty input, aborting`);
      return;
    }

    // Send user message using callback
    if (onSendMessage) {
      onSendMessage(userInput);
    }

    setUserInput("");
    setLoading(true);
    console.log(`✅ UI state updated: loading=true, input cleared`);

    try {
      console.log(`\n🌐 PREPARING API REQUEST:`);
      console.log(`   🎯 Source: "${source}"`);
      console.log(`   📝 Prompt: "${userInput}"`);
      console.log(`   🔗 Backend URL: ${import.meta.env.VITE_API_SERVER_URL}/api/leads`);

      // For scraper, use Server-Sent Events for real-time progress
      // Use regular API call for all sources including scraper
      const response = await fetchLeads(userInput, source);
      const leadData = response.leads || response;

      console.log(`✅ Received ${leadData.length} leads from ${source}`);

      if (leadData.length === 0) {
        const errorContent = `❌ No leads found for "${userInput}". Please try a different search term or location.`;
        if (onBotResponse) {
          onBotResponse(errorContent, []);
        }
        return;
      }

      const leadText = leadData.map((lead, index) =>
        `${index + 1}. ${lead.name || "N/A"} | ${lead.phone || "N/A"} | ${lead.email || "N/A"} | ${lead.website || "N/A"}`
      ).join("\n");

      const botContent = source === 'scraper'
        ? `✅ Successfully scraped ${leadData.length} ORGANIC leads from real websites:\n\n${leadText}`
        : `✅ Successfully generated ${leadData.length} leads using ${source.toUpperCase()}:\n\n${leadText}`;

      if (onBotResponse) {
        onBotResponse(botContent, leadData);
      }

    } catch (error) {
      console.error(`\n❌ CRITICAL ERROR IN CHAT:`, {
        message: error.message,
        stack: error.stack,
        source: source,
        prompt: userInput
      });

      setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
      console.log(`✅ Progress hidden due to error`);

      const errorContent = `❌ Failed to fetch leads: ${error.message}\n\nPlease check:\n- Your internet connection\n- The backend server is running\n- The prompt format is correct (e.g., "generate 50 leads of restaurants in California")`;
      console.log(`💬 Error message created`);

      if (onBotResponse) {
        onBotResponse(errorContent, []);
      }
      console.log(`✅ Error message sent via callback`);
    } finally {
      console.log(`\n🏁 CHAT HANDLER CLEANUP:`);
      console.log(`   🎯 Source: ${source}`);
      console.log(`   🔄 Current loading state: ${loading}`);

      setLoading(false);
      console.log(`✅ Loading set to false for all sources`);

      console.log(`⏰ Chat handler completed at: ${new Date().toISOString()}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#071629] to-[#112d5c] text-white">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-28">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}

        {/* Real-time Progress Display for Scraper */}
        {progress.show && (
          <div className="bg-blue-900/50 border border-blue-500 rounded-lg p-4 mx-auto max-w-md">
            <div className="text-center mb-3">
              <div className="text-blue-300 text-sm font-medium">🔍 Organic Web Scraping</div>
              <div className="text-white text-xs mt-1">{progress.message}</div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>

            {/* Progress Stats */}
            <div className="flex justify-between text-xs text-blue-200">
              <span>{progress.percent}% Complete</span>
              <span>📊 {progress.leadsFound} leads found</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="w-full flex items-center gap-2 px-6 py-4 fixed bottom-0 bg-[#112d5c] border-t border-gray-700">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 rounded-lg px-4 py-2 bg-white text-black focus:outline-none"
          placeholder="Type: generate 50 leads of restaurants in California"
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-white ${
            loading ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? (source === 'scraper' ? "Scraping..." : "Generating...") : "Send"}
        </button>
      </div>
    </div>
  );
};

export default Chat;
