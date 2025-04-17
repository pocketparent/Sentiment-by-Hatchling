import React, { useState, useEffect } from 'react';
import { Send, Shield } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if admin login is requested via URL parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const role = params.get('role');
    if (role === 'admin') {
      setIsAdminLogin(true);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isAdminLogin) {
      // Admin login with email/password
      try {
        const res = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        if (!res.ok) throw new Error('Invalid credentials');
        
        const data = await res.json();
        if (data.success) {
          // Store admin status in localStorage or context
          localStorage.setItem('isAdmin', 'true');
          localStorage.setItem('userId', data.userId);
          
          // Redirect to admin dashboard
          navigate('/admin');
        } else {
          setError(data.message || 'Login failed');
        }
      } catch (err: any) {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } else {
      // Regular user login with phone
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
          <h2 className="text-xl font-semibold text-clay-brown text-center">
            {isAdminLogin ? (
              <span className="flex items-center justify-center">
                <Shield size={20} className="mr-2" /> Admin Login
              </span>
            ) : (
              'Sign in'
            )}
          </h2>
          
          {error && (
            <p className="text-red-500 text-sm p-2 bg-blush-pink bg-opacity-30 rounded-lg text-center">
              {error}
            </p>
          )}
          
          {submitted && !isAdminLogin ? (
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
              {isAdminLogin ? (
                // Admin login form
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-clay-brown mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="admin@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-clay-brown mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full border border-warm-sand rounded-2xl px-4 py-2 text-sm bg-white focus:border-blush-pink focus:ring-1 focus:ring-blush-pink"
                    />
                  </div>
                </>
              ) : (
                // Regular user login form
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
              )}
              
              <button
                type="submit"
                className="w-full bg-warm-sand text-clay-brown py-2 rounded-2xl hover:bg-blush-pink transition font-medium"
              >
                {isAdminLogin ? 'Login' : 'Send Login Link'}
              </button>
              
              {!isAdminLogin && (
                <p className="text-xs text-dusty-taupe text-center mt-2">
                  We'll send a secure, one-time login link to your phone
                </p>
              )}
            </>
          )}
        </form>
        
        <div className="mt-6 text-center">
          {isAdminLogin ? (
            <p className="text-sm text-dusty-taupe">
              <a href="/login" className="text-clay-brown font-medium">
                Return to regular login
              </a>
            </p>
          ) : (
            <p className="text-sm text-dusty-taupe">
              Don't have an account?{' '}
              <a href="/invite" className="text-clay-brown font-medium">
                Use an invite code
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
