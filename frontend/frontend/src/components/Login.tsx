import React, { useState } from 'react';
import { Send } from 'lucide-react';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/auth/request-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-soft-beige px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="Hatchling Logo" 
            className="w-20 h-20 mx-auto mb-4"
            onError={(e) => {
              // Fallback if image doesn't exist
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-bold text-clay-brown">Hatchling</h1>
          <p className="text-dusty-taupe mt-1">Capture your little one's moments</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-warm-sand space-y-4">
          <h2 className="text-xl font-semibold text-clay-brown text-center">Sign in</h2>
          
          {error && (
            <p className="text-red-500 text-sm p-2 bg-blush-pink bg-opacity-30 rounded-lg text-center">
              {error}
            </p>
          )}
          
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-warm-sand rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={24} className="text-clay-brown" />
              </div>
              <p className="text-clay-brown font-medium">Check your phone!</p>
              <p className="text-dusty-taupe text-sm mt-2">
                We've sent a secure login link to your phone number.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-clay-brown mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-warm-sand text-clay-brown py-2 rounded-2xl hover:bg-blush-pink transition font-medium"
              >
                Send Login Link
              </button>
              
              <p className="text-xs text-dusty-taupe text-center mt-2">
                We'll send a secure, one-time login link to your phone
              </p>
            </>
          )}
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-dusty-taupe">
            Don't have an account?{' '}
            <a href="/invite" className="text-clay-brown font-medium">
              Use an invite code
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
