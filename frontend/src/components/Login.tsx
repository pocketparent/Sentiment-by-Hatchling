import React, { useState } from 'react';

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
    <div className="min-h-screen flex items-center justify-center bg-[#fefcf9] px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-xl w-full max-w-sm space-y-4">
        <h2 className="text-xl font-semibold text-center">Sign in to Hatchling</h2>
        <input
          type="tel"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full border border-neutral-300 rounded-lg px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-neutral-800 transition"
        >
          Send Login Link
        </button>
        {submitted && <p className="text-green-600 text-sm text-center">Check your phone for the login link!</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
