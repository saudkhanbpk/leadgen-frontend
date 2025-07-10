import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_SERVER_URL || `${import.meta.env.VITE_API_SERVER_URL}`;

const GoogleSheetPicker = ({ setLeads }) => {
  const [authData, setAuthData] = useState(() => {
    // Try to load from localStorage for session continuity
    const stored = localStorage.getItem('googleAuthData');
    return stored ? JSON.parse(stored) : null;
  });
  const [sheets, setSheets] = useState([]);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [range, setRange] = useState('Sheet1!A:B');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper: Open Google OAuth login
  const handleLogin = () => {
    const authUrl = `${API_BASE}/api/auth/google`;
    window.location.href = authUrl;
  };

  // Listen for authData from /google-auth-success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authDataParam = params.get('authData');
    if (authDataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authDataParam));
        setAuthData(parsed);
        localStorage.setItem('googleAuthData', JSON.stringify(parsed));
        window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Fetch user's Google Sheets list
  const fetchSheets = async () => {
    setLoading(true);
    setError('');
    try {
      if (!authData?.access_token) {
        handleLogin();
        return;
      }
      const res = await axios.post(`${API_BASE}/api/export/google-sheets/list`, { token: authData.access_token });
      setSheets(res.data.spreadsheets || []);
    } catch (err) {
      setError('Failed to fetch Google Sheets. Please login again.');
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('googleAuthData');
        setAuthData(null);
      }
    }
    setLoading(false);
  };

  // Fetch leads from selected sheet
  const fetchLeads = async () => {
    setLoading(true);
    setError('');
    try {
      if (!authData?.access_token) {
        handleLogin();
        return;
      }
      if (!spreadsheetId) {
        setError('Please select a Google Sheet.');
        setLoading(false);
        return;
      }
      const res = await axios.post(`${API_BASE}/api/export/google-sheets/fetch`, {
        token: authData.access_token,
        spreadsheetId,
        range
      });
      setLeads(res.data.leads || []);
    } catch (err) {
      setError('Failed to fetch leads from Google Sheet.');
    }
    setLoading(false);
  };

  // Optionally, auto-fetch sheets after login
  useEffect(() => {
    if (authData?.access_token && sheets.length === 0) {
      fetchSheets();
    }
    // eslint-disable-next-line
  }, [authData]);

  return (
    <div>
      <h3>Google Sheet Leads</h3>
      {!authData?.access_token ? (
        <button onClick={handleLogin} className="bg-blue-600 text-white px-3 py-1 rounded">Login with Google</button>
      ) : (
        <>
          <button onClick={fetchSheets} className="bg-blue-500 text-white px-3 py-1 rounded mb-2">Pick from My Google Sheets</button>
          {sheets.length > 0 && (
            <select
              className="border p-1 w-full mb-2"
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
            >
              <option value="">Select a sheet</option>
              {sheets.map(sheet => (
                <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
              ))}
            </select>
          )}
          <input placeholder="Range (e.g. Sheet1!A:B)" value={range} onChange={e => setRange(e.target.value)} className="border p-1 w-full mb-2" />
          <button onClick={fetchLeads} className="bg-green-600 text-white px-3 py-1 rounded">Fetch Leads</button>
        </>
      )}
      {loading && <div className="mt-2 text-blue-700">Loading...</div>}
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  );
};

export default GoogleSheetPicker;
