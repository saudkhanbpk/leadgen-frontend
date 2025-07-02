import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const CaptchaModal = ({ isOpen, onClose, onSolved, siteKey, sessionId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCaptchaSuccess = async (token) => {
    console.log('🎯 CAPTCHA solved successfully!', token);
    setIsLoading(true);
    setError('');

    try {
      // Send the token to backend
      const response = await fetch(`${import.meta.env.VITE_API_SERVER_URL}/api/captcha/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId,
          captchaToken: token
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ CAPTCHA token sent to backend successfully');
        onSolved(token);
        onClose();
      } else {
        throw new Error(result.error || 'Failed to process CAPTCHA');
      }
    } catch (error) {
      console.error('❌ Error sending CAPTCHA token:', error);
      setError(`Failed to process CAPTCHA: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptchaError = () => {
    console.error('❌ reCAPTCHA error occurred');
    setError('CAPTCHA error occurred. Please try again.');
  };

  const handleCaptchaExpired = () => {
    console.log('⏰ reCAPTCHA expired');
    setError('CAPTCHA expired. Please solve it again.');
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">CAPTCHA Verification Required</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-2">
            Please complete the CAPTCHA verification to continue scraping leads.
          </p>
          <p className="text-xs text-gray-500">
            Session ID: {sessionId}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-center mb-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Processing CAPTCHA...</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <ReCAPTCHA
                sitekey={siteKey}
                onChange={handleCaptchaSuccess}
                onError={handleCaptchaError}
                onExpired={handleCaptchaExpired}
                theme="light"
                size="normal"
              />
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            After solving the CAPTCHA, the scraping process will automatically resume.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CaptchaModal;
