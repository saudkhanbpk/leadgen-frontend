import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_BASE = import.meta.env.VITE_API_SERVER_URL || `${import.meta.env.VITE_API_SERVER_URL}`;

function EmailSection({ goBack, scrapedLeads = [] }) {
  const [method, setMethod] = useState('google');
  const [leads, setLeads] = useState(scrapedLeads); // Initialize with scraped leads
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A:C');
  const [sheets, setSheets] = useState([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [authData, setAuthData] = useState(() => {
    // Try to load from localStorage for session continuity
    const stored = localStorage.getItem('googleAuthData');
    return stored ? JSON.parse(stored) : null;
  });
  const [sendingEmails, setSendingEmails] = useState(false);

  // Update leads when scrapedLeads prop changes
  useEffect(() => {
    if (scrapedLeads && scrapedLeads.length > 0) {
      setLeads(scrapedLeads);
      console.log('📧 Leads imported from chat section:', scrapedLeads);
    }
  }, [scrapedLeads]);

  // Load existing auth data on component mount
  useEffect(() => {
    const stored = localStorage.getItem('googleAuthData');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuthData(parsed);
      } catch (e) {
        console.error('Failed to parse stored auth data:', e);
        localStorage.removeItem('googleAuthData');
      }
    }
  }, []);

  // Handles both CSV and XLSX file uploads
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      import('papaparse').then(Papa => {
        Papa.parse(file, {
          header: true,
          complete: (results) => {
            setLeads(results.data);
          }
        });
      });
    } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsedData = XLSX.utils.sheet_to_json(firstSheet);
        setLeads(parsedData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file type. Please upload a CSV or Excel file.');
    }
  };

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const res = await axios.post(`${import.meta.env.VITE_API_SERVER_URL}/api/email/upload`, formData);
    setUploadedFile(res.data);
  };

  // Handle Google Auth using popup (preserves conversations)
  const handleGoogleAuth = () => {
    return new Promise((resolve, reject) => {
      // Listen for auth success message
      const messageListener = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          const newAuthData = event.data.authData;
          localStorage.setItem('googleAuthData', JSON.stringify(newAuthData));
          setAuthData(newAuthData);
          alert('✅ Google account connected successfully! You can now access your Google Sheets.');
          resolve(newAuthData);
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          alert('❌ Google authentication failed. Please try again.');
          reject(new Error('Authentication failed'));
        }
      };

      window.addEventListener('message', messageListener);

      // Open auth in popup window
      const authUrl = `${API_BASE}/api/auth/google?state=email`;
      const popup = window.open(authUrl, 'googleAuth', 'width=500,height=600,scrollbars=yes,resizable=yes');

      // Check if popup was blocked
      if (!popup) {
        window.removeEventListener('message', messageListener);
        alert('❌ Popup blocked! Please allow popups and try again.');
        reject(new Error('Popup blocked'));
        return;
      }

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          reject(new Error('Authentication cancelled'));
        }
      }, 1000);
    });
  };

  // Fetch user's Google Sheets list
  const fetchUserSheets = async () => {
    setLoadingSheets(true);
    try {
      if (!authData?.access_token) {
        await handleGoogleAuth();
        // After auth, the authData will be set, so we can continue
        if (!authData?.access_token) {
          setLoadingSheets(false);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/api/export/google-sheets/list`, {
        token: authData.access_token
      });

      if (res.data.success) {
        setSheets(res.data.spreadsheets || []);
      } else {
        throw new Error(res.data.error || 'Failed to fetch sheets');
      }
    } catch (err) {
      console.error('Google Sheets fetch error:', err);
      alert('Failed to fetch Google Sheets. Please try logging in again.');
      // Clear invalid auth data
      localStorage.removeItem('googleAuthData');
      setAuthData(null);
    }
    setLoadingSheets(false);
  };

  const fetchGoogleSheetLeads = async () => {
    if (!spreadsheetId) {
      alert('Please select a Google Sheet first');
      return;
    }

    setLoadingSheets(true);
    try {
      if (!authData?.access_token) {
        await handleGoogleAuth();
        if (!authData?.access_token) {
          setLoadingSheets(false);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/api/export/google-sheets/fetch`, {
        token: authData.access_token,
        spreadsheetId,
        range
      });

      if (res.data.success) {
        const fetchedLeads = res.data.leads || [];
        console.log("🚀 ~ fetchGoogleSheetLeads ~ res.data:", res.data)
        setLeads(fetchedLeads);

        // Debug: Log the fetched leads to see their structure
        console.log('📊 Fetched leads from Google Sheet:', fetchedLeads);
        if (fetchedLeads.length > 0) {
          console.log('📋 Sample lead structure:', fetchedLeads[0]);
          console.log('📧 Available keys:', Object.keys(fetchedLeads[0]));
        }

        alert(`✅ Successfully loaded ${fetchedLeads.length} leads from Google Sheet!`);
      } else {
        throw new Error(res.data.error || 'Failed to fetch leads');
      }
    } catch (err) {
      console.error('Google Sheet leads fetch error:', err);
      alert('Failed to fetch leads from Google Sheet');
    }
    setLoadingSheets(false);
  };

  // Handle Cancel All - Clear all email data
  const handleCancelAll = () => {
    // Clear all form fields
    setFromEmail('');
    setSubject('');
    setDescription('');

    // Clear uploaded attachment
    setUploadedFile(null);

    // Clear leads data
    setLeads([]);

    // Reset method to default
    setMethod('google');

    // Clear Google Sheets data
    setSpreadsheetId('');
    setRange('Sheet1!A:B');

    alert('✅ All email data cleared successfully!');
  };

  const sendEmails = async () => {
    const activeLeads = leads;

    // Validation
    if (!fromEmail) {
      alert('Please enter sender email');
      return;
    }
    if (!subject) {
      alert('Please enter email subject');
      return;
    }
    if (!description) {
      alert('Please enter email description');
      return;
    }
    if (!activeLeads || activeLeads.length === 0) {
      alert('No leads available to send emails to');
      return;
    }

    setSendingEmails(true);

    try {
      const payload = {
        from: fromEmail,
        leads: activeLeads,
        subject,
        description,
        attachments: uploadedFile ? [uploadedFile] : []
      };

      console.log(`📧 Sending emails to ${activeLeads.length} leads:`, activeLeads);
      console.log(`📎 Attachments:`, payload.attachments);

      await axios.post(`${API_BASE}/api/email/send-emails`, payload);

      alert(`✅ Emails sent successfully to ${activeLeads.length} leads!`);
    } catch (error) {
      console.error('Email sending error:', error);
      alert('❌ Failed to send emails. Please try again.');
    } finally {
      setSendingEmails(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full">
      {/* Top Banner - exactly like the leads section, but with a Leads button */}
      <div className="flex justify-end items-center px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-900 relative z-20">
        <button
          className="px-6 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
          onClick={goBack}
        >
          Leads
        </button>
      </div>

      {/* Main Email Sender UI with Right-edge Scrollbar */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
        <div className="p-4 space-y-4 w-full max-w-2xl mx-auto">
        <h2 className="text-xl font-bold">Lead Email Sender</h2>

        {/* Show notification when leads are imported from chat */}
        {scrapedLeads && scrapedLeads.length > 0 && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span className="font-medium">
                  {scrapedLeads.length} leads imported from Lead Generation section
                </span>
              </div>
              <button
                onClick={() => {
                  setLeads([]);
                  console.log('🗑️ Cleared imported leads');
                }}
                className="text-green-600 hover:text-green-800 text-sm underline"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="space-x-4">
            <button
              className={`p-2 rounded-lg transition-colors ${method === 'google' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setMethod('google')}
            >
              Google Sheet
            </button>
            <button
              className={`p-2 rounded-lg transition-colors ${method === 'local' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
              onClick={() => setMethod('local')}
            >
              Upload Local File
            </button>
          </div>
          <button
            className="p-2 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            onClick={handleCancelAll}
          >
            Cancel
          </button>
        </div>

        {method === 'local' && (
          <div>
            <h4>Upload CSV or Excel File</h4>
            <input type="file" accept=".csv, .xls, .xlsx" onChange={handleFileUpload} />
          </div>
        )}

        {method === 'google' && (
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900">Import Leads from Google Sheets</h3>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:bg-gray-400"
              onClick={fetchUserSheets}
              disabled={loadingSheets}
            >
              {loadingSheets ? 'Loading Sheets...' : 'Pick from My Google Sheets'}
            </button>
            {sheets.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Select Google Sheet:</label>
                <select
                  className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={spreadsheetId}
                  onChange={e => setSpreadsheetId(e.target.value)}
                >
                  <option value="">Choose a Google Sheet...</option>
                  {sheets.map(sheet => (
                    <option key={sheet.id} value={sheet.id}>
                      {sheet.name} {sheet.modifiedTime && `(${new Date(sheet.modifiedTime).toLocaleDateString()})`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Sheet Range:</label>
              <input
                className="border border-gray-300 p-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Range (e.g. Sheet1!A:B for Name & Email columns)"
                value={range}
                onChange={e => setRange(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                📋 <strong>Sheet Range Explanation:</strong><br/>
                • <code>Sheet1!A:C</code> = All rows in columns A, B, C (Name, Email, Phone)<br/>
                • <code>Sheet1!A1:B100</code> = Rows 1-100 in columns A & B<br/>
                • <strong>First row should contain headers</strong> (Name, Email, etc.)<br/>
                • Default: <code>Sheet1!A:B</code> (Name & Email columns)
              </p>
            </div>
            <button
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors disabled:bg-gray-400"
              onClick={fetchGoogleSheetLeads}
              disabled={!spreadsheetId || loadingSheets}
            >
              {loadingSheets ? 'Fetching...' : 'Fetch Leads'}
            </button>

            {/* Show success message and lead count */}
            {method === 'google' && leads.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Successfully loaded {leads.length} leads from Google Sheet!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <input
              type="email"
              className="border p-1 w-full"
              placeholder="Sender Email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
            />
            <input className="border p-1 w-full" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
            <textarea className="border p-1 w-full h-32" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
            <div className="flex items-center space-x-2">
              <span>Attachment:</span>
              <input type="file" onChange={handleAttachmentUpload} />
              {uploadedFile && <span className="text-green-600 text-sm">✓ {uploadedFile.name}</span>}
            </div>
          </div>

          {/* Display leads that will receive emails */}
          <div className="border p-4 rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-2">Recipients ({leads.length})</h3>
            <div className="max-h-40 overflow-y-auto">
              {leads.length === 0 ? (
                <p className="text-gray-500 text-sm">No leads loaded. Use "Google Sheet" or "Upload CSV" to add recipients.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-1">Name</th>
                      <th className="text-left p-1">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                  {leads.map((lead, idx) => {
                    // Extract name from various possible fields
                    const name = lead.name || lead.Name || lead['First Name'] || lead['Full Name'] || lead.fullName || '';
                    const lastName = lead['Last Name'] || lead.lastName || '';
                    const fullName = lastName ? `${name} ${lastName}`.trim() : name;

                    // ENHANCED EMAIL EXTRACTION - Find @ symbol in ANY field
                    let email = '';

                    // First try common email field names
                    email = lead.email || lead.Email || lead['Email Address'] || lead['email'] || lead['EMAIL'] || lead['E-mail'] || lead['e-mail'] || '';

                    // If no email found in standard fields, scan ALL object values for @ symbol
                    if (!email) {
                      const allValues = Object.values(lead);
                      for (const value of allValues) {
                        if (value && typeof value === 'string' && value.includes('@') && value.includes('.')) {
                          email = value.trim();
                          break;
                        }
                      }
                    }

                    // Debug log for first lead
                    if (idx === 0) {
                      console.log('🔍 Lead display debug:', {
                        originalLead: lead,
                        extractedName: fullName,
                        extractedEmail: email,
                        allLeadKeys: Object.keys(lead),
                        allLeadValues: Object.values(lead)
                      });

                      // Show which field contained the email
                      if (email) {
                        const emailField = Object.keys(lead).find(key => lead[key] === email);
                        console.log(`📧 Email "${email}" found in field: "${emailField}"`);
                      }
                    }

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-1">{fullName}</td>
                        <td className="p-1">{email}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>

          <button
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 w-full rounded transition-colors duration-200 font-medium"
            onClick={sendEmails}
            disabled={sendingEmails}
          >
            {sendingEmails ? 'Sending...' : 'Send Emails'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

export default EmailSection;
