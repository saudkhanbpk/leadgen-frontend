import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User, Bot, Download, FileSpreadsheet, Mail, Phone, MapPin, Building } from 'lucide-react';

const MessageBubble = ({ message, onSendEmails }) => {
  const isUser = message.type === 'user';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStep, setGoogleStep] = useState('choose'); // 'choose', 'existing', 'new'
  const [spreadsheets, setSpreadsheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authData, setAuthData] = useState(null);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkExistingAuth = async () => {
      const storedAuthData = localStorage.getItem('googleAuthData');
      if (storedAuthData) {
        try {
          const parsedAuthData = JSON.parse(storedAuthData);

          // Validate the stored tokens
          const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/auth/validate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(parsedAuthData),
          });

          const result = await response.json();
          if (result.success && result.valid) {
            // If tokens were refreshed, update stored data
            if (result.authData) {
              localStorage.setItem('googleAuthData', JSON.stringify(result.authData));
              setAuthData(result.authData);
              setAuthToken(result.authData.access_token);
            } else {
              setAuthData(parsedAuthData);
              setAuthToken(parsedAuthData.access_token);
            }
            setIsAuthenticated(true);
          } else if (result.needsReauth) {
            // Clear invalid tokens
            localStorage.removeItem('googleAuthData');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Failed to validate stored auth:', error);
          localStorage.removeItem('googleAuthData');
          setIsAuthenticated(false);
        }
      }
    };

    checkExistingAuth();
  }, []);

  const formatTime = (dateValue) => {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return ''; // handle invalid date
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function to format leads to HubSpot Contacts Template structure
  const formatLeadsToHubspotTemplate = (leads) => {
    return leads.map(lead => {
      // Split name into first and last name
      const nameParts = (lead.name || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Extract city from address or location
      let city = '';
      if (lead.address) {
        // Try to extract city from address (usually after comma)
        const addressParts = lead.address.split(',');
        city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : lead.address.trim();
      } else if (lead.location) {
        city = lead.location;
      }

      return {
        'First Name': firstName,
        'Last Name': lastName,
        'Email Address': lead.email || '',
        'Phone Number': lead.phone || '',
        'City': city
        // 'Lifecycle Stage': 'Lead',
        // 'Contact Owner': '',
        // 'Favorite Ice Cream Flavor': ''
      };
    });
  };

  const downloadCSV = () => {
    if (!message.leads || message.leads.length === 0) return;

    const formattedLeads = formatLeadsToHubspotTemplate(message.leads);
    const headers = ['First Name', 'Last Name', 'Email Address', 'Phone Number', 'City']; // 'Lifecycle Stage', 'Contact Owner', 'Favorite Ice Cream Flavor'
    const csvContent = [
      headers.join(','),
      ...formattedLeads.map(lead => [
        `"${lead['First Name']}"`,
        `"${lead['Last Name']}"`,
        `"${lead['Email Address']}"`,
        `"${lead['Phone Number']}"`,
        `"${lead['City']}"`
        // `"${lead['Lifecycle Stage']}"`,
        // `"${lead['Contact Owner']}"`,
        // `"${lead['Favorite Ice Cream Flavor']}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hubspot-leads-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!message.leads || message.leads.length === 0) return;

    const formattedLeads = formatLeadsToHubspotTemplate(message.leads);
    const worksheet = XLSX.utils.json_to_sheet(formattedLeads);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'HubSpot Leads');

    XLSX.writeFile(workbook, `hubspot-leads-${Date.now()}.xlsx`);
  };

  const handleGoogleSheets = () => {
    if (!message.leads || message.leads.length === 0) return;

    // Check if user is already authenticated
    if (isAuthenticated && authData) {
      // User is already authenticated, proceed directly to export
      handleGoogleSheetsExport(authData);
      return;
    }

    setLoading(true);

    // Store the leads data temporarily
    window.tempLeadsData = message.leads;

    // Listen for both postMessage and custom event
    const messageListener = (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        window.removeEventListener('message', messageListener);
        // Store the new auth data
        const newAuthData = event.data.authData;
        localStorage.setItem('googleAuthData', JSON.stringify(newAuthData));
        setAuthData(newAuthData);
        setAuthToken(newAuthData.access_token);
        setIsAuthenticated(true);
        handleGoogleSheetsExport(newAuthData);
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        window.removeEventListener('message', messageListener);
        setLoading(false);
        alert('❌ Google authentication failed. Please try again.');
      }
    };

    const customEventListener = (event) => {
      window.removeEventListener('googleAuthComplete', customEventListener);
      const newAuthData = event.detail.authData;
      localStorage.setItem('googleAuthData', JSON.stringify(newAuthData));
      setAuthData(newAuthData);
      setAuthToken(newAuthData.access_token);
      setIsAuthenticated(true);
      handleGoogleSheetsExport(newAuthData);
    };

    window.addEventListener('message', messageListener);
    window.addEventListener('googleAuthComplete', customEventListener);

    // Open the auth window
    const authUrl = `${import.meta.env.VITE_API_SERVER_URL}/api/auth/google`;
    window.open(authUrl, '_blank');
  };

  const handleGoogleSheetsExport = async (authDataParam) => {
    // Handle both old token format and new authData format
    let currentAuthData;
    if (typeof authDataParam === 'string') {
      // Old format - just a token
      currentAuthData = { access_token: authDataParam };
    } else {
      // New format - full auth data object
      currentAuthData = authDataParam;
    }

    setAuthData(currentAuthData);
    setAuthToken(currentAuthData.access_token);
    setShowGoogleModal(true);
    setGoogleStep('choose');
    setLoading(false);
  };

  const fetchExistingSheets = async () => {
    setLoading(true);
    try {
      // Check if token needs refresh
      let currentToken = authToken;
      if (authData && authData.expires_at && Date.now() >= authData.expires_at) {
        const refreshResponse = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: authData.refresh_token }),
        });

        const refreshResult = await refreshResponse.json();
        if (refreshResult.success) {
          const newAuthData = refreshResult.authData;
          localStorage.setItem('googleAuthData', JSON.stringify(newAuthData));
          setAuthData(newAuthData);
          setAuthToken(newAuthData.access_token);
          currentToken = newAuthData.access_token;
        } else {
          throw new Error('Authentication expired. Please log in again.');
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/export/google-sheets/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: currentToken }),
      });

      const result = await response.json();
      if (result.success) {
        setSpreadsheets(result.spreadsheets);
        setGoogleStep('existing');
      } else {
        throw new Error(result.error || 'Failed to fetch spreadsheets');
      }
    } catch (error) {
      console.error('Failed to fetch spreadsheets:', error);
      alert(`❌ Failed to fetch spreadsheets: ${error.message}`);

      // If authentication error, clear stored data and require re-auth
      if (error.message.includes('Authentication expired')) {
        localStorage.removeItem('googleAuthData');
        setIsAuthenticated(false);
        setAuthData(null);
        setAuthToken('');
        setShowGoogleModal(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExisting = async () => {
    if (!selectedSheet) {
      alert('Please select a spreadsheet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/export/google-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: formatLeadsToHubspotTemplate(message.leads),
          token: authToken,
          createNew: false,
          spreadsheetId: selectedSheet
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Successfully exported ${message.leads.length} leads to existing Google Sheet!`);
        window.open(`https://docs.google.com/spreadsheets/d/${selectedSheet}`, '_blank');
        setShowGoogleModal(false);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Google Sheets export failed:', error);
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToNew = async () => {
    if (!newSheetTitle.trim()) {
      alert('Please enter a title for the new spreadsheet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/export/google-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leads: formatLeadsToHubspotTemplate(message.leads),
          token: authToken,
          createNew: true,
          newSheetTitle: newSheetTitle
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Successfully exported ${message.leads.length} leads to new Google Sheet!`);
        if (result.sheetId) {
          window.open(`https://docs.google.com/spreadsheets/d/${result.sheetId}`, '_blank');
        }
        setShowGoogleModal(false);
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('Google Sheets export failed:', error);
      alert(`❌ Export failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = () => {
    localStorage.removeItem('googleAuthData');
    setIsAuthenticated(false);
    setAuthData(null);
    setAuthToken('');
    setShowGoogleModal(false);
    alert('✅ Google account disconnected. You will need to authenticate again for future exports.');
  };
  const handleSendEmails = () => {
    if (message.leads && message.leads.length > 0 && typeof onSendEmails === 'function') {
      onSendEmails(message.leads);
    } else {
      alert('No leads available to send emails.');
    }
  };


  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-start gap-3`}>
      {!isUser && (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <Bot size={16} className="text-white" />
        </div>
      )}
      
      <div className={`max-w-[70%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl backdrop-blur-lg ${
            isUser
              ? 'bg-blue-600 text-white ml-auto'
              : 'bg-white/10 text-white border border-white/20'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {/* Leads Display */}
          {message.leads && message.leads.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">Generated Leads ({message.leads.length})</h4>
                <div className="flex gap-2">
                  <button
                    onClick={downloadCSV}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-xs text-white rounded-lg transition-colors"
                  >
                    <Download size={12} />
                    CSV
                  </button>
                  <button
                    onClick={downloadExcel}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-xs text-white rounded-lg transition-colors"
                  >
                    <FileSpreadsheet size={12} />
                    Excel
                  </button>
                  <div className="relative">
                    <button
                      onClick={handleGoogleSheets}
                      disabled={loading}
                      className={`flex items-center gap-1 px-3 py-1 text-xs text-white rounded-lg transition-colors disabled:bg-gray-400 ${
                        isAuthenticated
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      <FileSpreadsheet size={12} />
                      {loading ? 'Exporting...' : isAuthenticated ? 'Google Sheets ✓' : 'Google Sheets'}
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={handleDisconnectGoogle}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                        title="Disconnect Google Account"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSendEmails}
                    className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-xs text-white rounded-lg transition-colors"
                  >
                    <Mail size={12} />
                    Email
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {Array.isArray(message.leads) && message.leads.slice(0, 5).map((lead, index) => (
                  <div key={index} className="p-3 bg-black/20 rounded-lg text-sm">
                    <div className="font-medium mb-2">{lead.name}</div>
                    <div className="space-y-1 text-xs text-white/80">
                      <div className="flex items-center gap-2">
                        <Phone size={10} />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={10} />
                        <span>{lead.address}</span>
                      </div>
                      {lead.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={10} />
                          <span>{lead.email}</span>
                        </div>
                      )}
                      {lead.company && (
                        <div className="flex items-center gap-2">
                          <Building size={10} />
                          <span>{lead.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {Array.isArray(message.leads) && message.leads.length > 5 && (
                  <div className="text-center text-xs text-white/60 py-2">
                    +{message.leads.length - 5} more leads available for export
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className={`text-xs text-white/40 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <User size={16} className="text-white" />
        </div>
      )}

      {/* Google Sheets Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Export to Google Sheets
            </h3>

            {googleStep === 'choose' && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Choose how you want to export your {message.leads?.length} leads:
                </p>

                <div className="space-y-3">
                  <button
                    onClick={fetchExistingSheets}
                    disabled={loading}
                    className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100"
                  >
                    <div className="font-medium text-gray-900">Add to Existing Sheet</div>
                    <div className="text-sm text-gray-500">Append leads to an existing Google Sheet</div>
                  </button>

                  <button
                    onClick={() => {
                      setGoogleStep('new');
                      setNewSheetTitle(`Leads Export ${new Date().toLocaleDateString()}`);
                    }}
                    className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900">Create New Sheet</div>
                    <div className="text-sm text-gray-500">Create a new Google Sheet for these leads</div>
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowGoogleModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {googleStep === 'existing' && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Select an existing spreadsheet to add your leads to:
                </p>

                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {spreadsheets.map((sheet) => (
                    <label key={sheet.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="selectedSheet"
                        value={sheet.id}
                        checked={selectedSheet === sheet.id}
                        onChange={(e) => setSelectedSheet(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{sheet.name}</div>
                        <div className="text-sm text-gray-500">
                          Modified: {new Date(sheet.modifiedTime).toLocaleDateString()}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between gap-2 pt-4">
                  <button
                    onClick={() => setGoogleStep('choose')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowGoogleModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExportToExisting}
                      disabled={!selectedSheet || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                      {loading ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {googleStep === 'new' && (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Enter a name for your new spreadsheet:
                </p>

                <input
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder="Enter spreadsheet name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />

                <div className="flex justify-between gap-2 pt-4">
                  <button
                    onClick={() => setGoogleStep('choose')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowGoogleModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExportToNew}
                      disabled={!newSheetTitle.trim() || loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                      {loading ? 'Creating...' : 'Create & Export'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;