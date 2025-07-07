import React, { useEffect, useRef, useState } from "react";
import { fetchLeads } from "../api/index";
import MessageBubble from "./MessageBubble";
import CaptchaModal from "./CaptchaModal";

const Chat = ({ selectedSource, conversation, onSendMessage, onBotResponse }) => {
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(selectedSource || 'apify');
  const [progress, setProgress] = useState({ show: false, message: '', percent: 0, leadsFound: 0 });
  const [captchaModal, setCaptchaModal] = useState({ show: false, siteKey: '', sessionId: '', prompt: '' });
  const [pendingRequest, setPendingRequest] = useState(null); // Store request to retry after CAPTCHA
  const messagesEndRef = useRef(null);

  // Function to fetch leads with real-time progress for scraper
  const fetchLeadsWithProgress = async (prompt, source) => {
    return new Promise((resolve, reject) => {
      console.log('🌐 Opening SSE connection to backend...');
      const eventSource = new EventSource(`${import.meta.env.VITE_API_SERVER_URL}/api/leads/stream?source=${source}&prompt=${encodeURIComponent(prompt)}&maxResults=50`);

      let finalResult = null;
      let lastProgressTime = Date.now();

      // Monitor connection health
      const connectionMonitor = setInterval(() => {
        const timeSinceLastProgress = Date.now() - lastProgressTime;
        if (timeSinceLastProgress > 30000) { // 30 seconds without progress
          console.log('⚠️ No progress updates for 30 seconds, but keeping connection open...');
          setProgress(prev => ({
            ...prev,
            message: prev.message + ' (Still working, please wait...)'
          }));
        }
      }, 30000);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'progress') {
            console.log('📊 Progress update received:', data);
            lastProgressTime = Date.now(); // Update last progress time
            setProgress({
              show: true,
              message: data.message || 'Scraping in progress...',
              percent: data.percent || 0,
              leadsFound: data.leadsFound || 0
            });
          } else if (data.type === 'complete') {
            console.log('✅ Scraping completed, received final result');
            clearInterval(connectionMonitor);
            finalResult = data;
            eventSource.close();
            resolve(finalResult);
          } else if (data.type === 'error') {
            console.log('❌ Scraping error received from backend');
            clearInterval(connectionMonitor);
            eventSource.close();
            reject(new Error(data.message || 'Scraping failed'));
          } else if (data.type === 'captcha') {
            console.log('🔒 CAPTCHA required, pausing scraping');
            clearInterval(connectionMonitor);
            eventSource.close();
            resolve(data); // Return CAPTCHA response
          } else {
            console.log('📨 Unknown message type received:', data.type);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        console.log('SSE Connection state:', eventSource.readyState);

        // Only close and fallback if the connection is permanently broken
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('SSE Connection permanently closed, falling back to regular API');
          clearInterval(connectionMonitor);
          // Fallback to regular API call
          fetchLeads(prompt, source).then(resolve).catch(reject);
        } else {
          console.log('SSE Connection error but still open, continuing to wait for backend...');
          // Don't close the connection, let it retry automatically
          setProgress(prev => ({
            ...prev,
            message: 'Connection interrupted, retrying... Please wait.'
          }));
        }
      };

      // No timeout - let the backend control when scraping is complete
      // The backend will send 'complete' or 'error' events when done
    });
  };

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

      // Show progress for all sources
      setProgress({
        show: true,
        message: source === 'scraper' ? 'Starting web scraping...' : 'Generating leads...',
        percent: 0,
        leadsFound: 0
      });

      // For scraper, use Server-Sent Events for real-time progress
      if (source === 'scraper') {
        const response = await fetchLeadsWithProgress(userInput, source);

        // Check if CAPTCHA is required
        if (response.captchaRequired) {
          console.log(`🔒 CAPTCHA required for scraping`);
          console.log(`   Session ID: ${response.sessionId}`);
          console.log(`   Site Key: ${response.siteKey}`);

          // Store the request details to retry after CAPTCHA
          setPendingRequest({ prompt: userInput, source: source });

          // Show CAPTCHA modal
          setCaptchaModal({
            show: true,
            siteKey: response.siteKey,
            sessionId: response.sessionId,
            prompt: userInput
          });

          // Show message to user about CAPTCHA
          const captchaMessage = `🔒 CAPTCHA verification required to continue scraping. Please complete the CAPTCHA challenge.`;
          if (onBotResponse) {
            onBotResponse(captchaMessage, []);
          }

          // Hide progress
          setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
          return;
        }

        // Handle API error responses gracefully
        if (response.error || (response.message && !response.leads && !Array.isArray(response))) {
          console.error('❌ API returned error response:', response);
          throw new Error(response.error || response.message || 'API returned an error');
        }

        // Ensure leadData is always an array - handle various response structures
        let leadData = response.leads || response.data || response.results || response;

        // Convert to safe array - handle all possible response structures
        const safeLeadData = Array.isArray(leadData) ? leadData : [];

        if (safeLeadData.length === 0 && leadData && typeof leadData === 'object') {
          console.error('❌ CRITICAL ERROR: No valid lead data found in response:', response);
          // Try to extract from nested structures
          if (leadData.leads && Array.isArray(leadData.leads)) {
            leadData = leadData.leads;
          } else if (leadData.data && Array.isArray(leadData.data)) {
            leadData = leadData.data;
          } else if (leadData.results && Array.isArray(leadData.results)) {
            leadData = leadData.results;
          } else {
            leadData = [];
          }
        } else {
          leadData = safeLeadData;
        }

        console.log(`✅ Received ${leadData.length} leads from ${source}`);

        if (leadData.length === 0) {
          const errorContent = `❌ No leads found for "${userInput}". Please try a different search term or location.`;
          if (onBotResponse) {
            onBotResponse(errorContent, []);
          }
          setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
          return;
        }

        const leadText = leadData.map((lead, index) =>
          `${index + 1}. ${lead.name || "N/A"} | ${lead.phone || "N/A"} | ${lead.email || "N/A"} | ${lead.website || "N/A"}`
        ).join("\n");

        const botContent = `✅ Successfully scraped ${leadData.length} ORGANIC leads from real websites:\n\n${leadText}`;

        if (onBotResponse) {
          onBotResponse(botContent, leadData);
        }

        // Hide progress after completion
        setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
        return;
      }

      // For other sources, use regular API call
      const response = await fetchLeads(userInput, source);

      // Update progress for non-scraper sources
      setProgress({
        show: true,
        message: 'Processing request...',
        percent: 50,
        leadsFound: 0
      });

      // Check if CAPTCHA is required
      if (response.captchaRequired) {
        console.log(`🔒 CAPTCHA required for scraping`);
        console.log(`   Session ID: ${response.sessionId}`);
        console.log(`   Site Key: ${response.siteKey}`);

        // Store the request details to retry after CAPTCHA
        setPendingRequest({ prompt: userInput, source: source });

        // Show CAPTCHA modal
        setCaptchaModal({
          show: true,
          siteKey: response.siteKey,
          sessionId: response.sessionId,
          prompt: userInput
        });

        // Show message to user about CAPTCHA
        const captchaMessage = `🔒 CAPTCHA verification required to continue scraping. Please complete the CAPTCHA challenge.`;
        if (onBotResponse) {
          onBotResponse(captchaMessage, []);
        }

        // Hide progress
        setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
        return;
      }

      // Handle API error responses gracefully
      if (response.error || (response.message && !response.leads && !Array.isArray(response))) {
        console.error('❌ API returned error response:', response);
        throw new Error(response.error || response.message || 'API returned an error');
      }

      // Ensure leadData is always an array - handle various response structures
      let leadData = response.leads || response.data || response.results || response;

      // Convert to safe array - handle all possible response structures
      const safeLeadData = Array.isArray(leadData) ? leadData : [];

      if (safeLeadData.length === 0 && leadData && typeof leadData === 'object') {
        console.error('❌ CRITICAL ERROR: No valid lead data found in response:', response);
        // Try to extract from nested structures
        if (leadData.leads && Array.isArray(leadData.leads)) {
          leadData = leadData.leads;
        } else if (leadData.data && Array.isArray(leadData.data)) {
          leadData = leadData.data;
        } else if (leadData.results && Array.isArray(leadData.results)) {
          leadData = leadData.results;
        } else {
          leadData = [];
        }
      } else {
        leadData = safeLeadData;
      }

      console.log(`✅ Received ${leadData.length} leads from ${source}`);

      // Update progress with final count
      setProgress({
        show: true,
        message: 'Finalizing results...',
        percent: 100,
        leadsFound: leadData.length
      });

      if (leadData.length === 0) {
        const errorContent = `❌ No leads found for "${userInput}". Please try a different search term or location.`;
        if (onBotResponse) {
          onBotResponse(errorContent, []);
        }
        setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
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

      // Hide progress after completion
      setTimeout(() => {
        setProgress({ show: false, message: '', percent: 0, leadsFound: 0 });
      }, 2000);

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

  const handleCaptchaSolved = async (token) => {
    console.log('✅ CAPTCHA solved in Chat component:', token);
    setCaptchaModal({ show: false, siteKey: '', sessionId: '', prompt: '' });

    // Show success message
    const successMessage = `✅ CAPTCHA solved successfully! Restarting scraping process...`;
    if (onBotResponse) {
      onBotResponse(successMessage, []);
    }

    // Resume scraping after CAPTCHA is solved
    if (pendingRequest) {
      console.log('🔄 Resuming scraping after CAPTCHA solved');
      setLoading(true);

      try {
        // Wait a moment for backend to process CAPTCHA
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Call the resume scraping endpoint
        const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/captcha/resume-scraping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: captchaModal.sessionId,
            prompt: pendingRequest.prompt
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Handle API error responses gracefully
          if (result.error || (result.message && !result.leads && !Array.isArray(result))) {
            console.error('❌ API returned error response:', result);
            throw new Error(result.error || result.message || 'API returned an error');
          }

          // Ensure leadData is always an array - handle various response structures
          let leadData = result.leads || result.data || result.results || result;

          // Convert to safe array - handle all possible response structures
          const safeLeadData = Array.isArray(leadData) ? leadData : [];

          if (safeLeadData.length === 0 && leadData && typeof leadData === 'object') {
            console.error('❌ CRITICAL ERROR: No valid lead data found in result:', result);
            // Try to extract from nested structures
            if (leadData.leads && Array.isArray(leadData.leads)) {
              leadData = leadData.leads;
            } else if (leadData.data && Array.isArray(leadData.data)) {
              leadData = leadData.data;
            } else if (leadData.results && Array.isArray(leadData.results)) {
              leadData = leadData.results;
            } else {
              leadData = [];
            }
          } else {
            leadData = safeLeadData;
          }

          if (leadData.length === 0) {
            const errorContent = `❌ No leads found for "${pendingRequest.prompt}". Please try a different search term or location.`;
            if (onBotResponse) {
              onBotResponse(errorContent, []);
            }
            return;
          }

          const leadText = leadData.map((lead, index) =>
            `${index + 1}. ${lead.name || "N/A"} | ${lead.phone || "N/A"} | ${lead.email || "N/A"} | ${lead.website || "N/A"}`
          ).join("\n");

          const botContent = `✅ Successfully scraped ${leadData.length} ORGANIC leads from real websites:\n\n${leadText}`;

          if (onBotResponse) {
            onBotResponse(botContent, leadData);
          }
        } else {
          throw new Error(result.error || 'Failed to resume scraping');
        }

      } catch (error) {
        console.error('❌ Error resuming scraping after CAPTCHA:', error);
        const errorContent = `❌ Failed to complete scraping after CAPTCHA: ${error.message}`;
        if (onBotResponse) {
          onBotResponse(errorContent, []);
        }
      } finally {
        setLoading(false);
        setPendingRequest(null);
      }
    }
  };

  const handleCaptchaClose = () => {
    console.log('❌ CAPTCHA modal closed');
    setCaptchaModal({ show: false, siteKey: '', sessionId: '', prompt: '' });
    setPendingRequest(null); // Clear pending request

    // Show cancellation message
    const cancelMessage = `❌ CAPTCHA verification cancelled. Please try your search again.`;
    if (onBotResponse) {
      onBotResponse(cancelMessage, []);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#071629] to-[#112d5c] text-white relative">
      {/* Messages Area - with proper spacing for input box */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-4">
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

      {/* Input Box - positioned at bottom of chat area only */}
      <div className="flex-shrink-0 px-6 py-4 bg-[#112d5c] border-t border-gray-700">
        <div className="flex items-center bg-white rounded-lg overflow-hidden shadow-lg">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-4 py-3 text-black focus:outline-none placeholder-gray-500"
            placeholder="Type: generate 50 leads of restaurants in California"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className={`px-6 py-3 text-white font-medium transition-colors ${
              loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (source === 'scraper' ? "Scraping..." : "Enter") : "Enter"}
          </button>
        </div>
      </div>



      {/* CAPTCHA Modal */}
      <CaptchaModal
        isOpen={captchaModal.show}
        onClose={handleCaptchaClose}
        onSolved={handleCaptchaSolved}
        siteKey={captchaModal.siteKey}
        sessionId={captchaModal.sessionId}
        prompt={captchaModal.prompt}
      />
    </div>
  );
};

export default Chat;
