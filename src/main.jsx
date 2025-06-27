import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import './index.css';

const CLIENT_ID = '463968146314-0va6goebhdh2ppi89e6g06oe4r7vf801.apps.googleusercontent.com';

import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);
