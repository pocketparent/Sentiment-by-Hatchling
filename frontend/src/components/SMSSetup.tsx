import React, { useState } from 'react';
import { sendVerificationCode, confirmVerificationCode } from '../api/sms';

interface SMSSetupProps {
  userId: string;
}

const SMSSetup: React.FC<SMSSetupProps> = ({ userId }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip all non-numeric characters
    const cleaned = e.target.value.replace(/\D/g, '');
    
    // Format with parentheses and dashes
    let formatted = cleaned;
    if (cleaned.length > 0) {
      if (cleaned.length <= 3) {
        formatted = `(${cleaned}`;
      } else if (cleaned.length <= 6) {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      } else {
        formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      }
    }
    
    setPhoneNumber(formatted);
  };

  // Send verification code
  const handleSendVerification = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    // Strip all non-numeric characters for API call
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanedNumber.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await sendVerificationCode(`+1${cleanedNumber}`, userId);
      
      if (response.success) {
        setIsVerifying(true);
        setSuccess('Verification code sent! Please check your phone.');
      } else {
        setError(response.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error('SMS verification error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    
    if (!verificationCode || verificationCode.length < 4) {
      setError('Please enter the verification code');
      setIsLoading(false);
      return;
    }
    
    try {
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      
      const response = await confirmVerificationCode(`+1${cleanedNumber}`, verificationCode, userId);
      
      if (response.success) {
        setIsVerified(true);
        setSuccess('Phone number verified successfully! You can now send journal entries via SMS.');
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      console.error('SMS confirmation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the verification process
  const handleReset = () => {
    setIsVerifying(false);
    setVerificationCode('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-warm-sand">
      <h3 className="text-lg font-semibold text-clay-brown mb-4">SMS Journal Entries</h3>
      
      {isVerified ? (
        <div className="space-y-4">
          <div className="bg-green-50 p-4 rounded-xl text-green-700">
            <p className="font-medium">Your phone number is verified!</p>
            <p className="text-sm mt-1">Send text messages to create journal entries.</p>
          </div>
          
          <div className="bg-soft-beige p-4 rounded-xl">
            <h4 className="font-medium text-clay-brown mb-2">How to use:</h4>
            <ol className="list-decimal list-inside text-sm space-y-2 text-dusty-taupe">
              <li>Text your memory to <span className="font-medium text-clay-brown">555-HATCHLING</span></li>
              <li>Include a date in your message to set when the memory happened</li>
              <li>Your entry will automatically appear in your journal</li>
              <li>Our AI will generate tags based on your message</li>
            </ol>
          </div>
          
          <button
            onClick={() => setIsVerified(false)}
            className="text-sm text-dusty-taupe hover:text-clay-brown"
          >
            Change phone number
          </button>
        </div>
      ) : isVerifying ? (
        <div className="space-y-4">
          <p className="text-sm text-dusty-taupe">
            We've sent a verification code to {phoneNumber}
          </p>
          
          <div>
            <label className="block text-sm font-medium text-clay-brown mb-1">
              Enter verification code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="w-full border border-warm-sand rounded-xl px-3 py-2 text-sm focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              placeholder="123456"
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          {success && (
            <p className="text-green-600 text-sm">{success}</p>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={handleVerifyCode}
              disabled={isLoading}
              className={`px-4 py-2 bg-clay-brown text-white rounded-xl text-sm ${
                isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blush-pink'
              }`}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-warm-sand text-clay-brown rounded-xl text-sm hover:bg-soft-beige"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-dusty-taupe">
            Add your phone number to create journal entries via text message.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-clay-brown mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              className="w-full border border-warm-sand rounded-xl px-3 py-2 text-sm focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
              placeholder="(555) 123-4567"
              maxLength={14}
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          <button
            onClick={handleSendVerification}
            disabled={isLoading}
            className={`w-full py-2 bg-clay-brown text-white rounded-xl text-sm ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blush-pink'
            }`}
          >
            {isLoading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SMSSetup;
