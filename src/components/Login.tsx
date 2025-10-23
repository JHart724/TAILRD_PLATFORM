import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TailrdLogo from './TailrdLogo';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For MVP, any login credentials work
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 via-steel-100 to-steel-200 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-retina-4 p-8 w-full max-w-md border border-white/20">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <TailrdLogo size="large" variant="light" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500 focus:border-transparent bg-white/70 backdrop-blur text-steel-900 placeholder-steel-500"
              required
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-steel-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue-500 focus:border-transparent bg-white/70 backdrop-blur text-steel-900 placeholder-steel-500"
              required
            />
          </div>

          <div className="text-right">
            <a href="#" className="text-sm text-steel-600 hover:text-medical-blue-600 transition-colors">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-steel-800 hover:bg-steel-900 text-white font-semibold rounded-lg transition-colors duration-200 shadow-medical-card"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-steel-600">
            Don't have an account?{' '}
            <a href="#" className="text-medical-blue-600 hover:text-medical-blue-700 font-semibold transition-colors">
              Register here today.
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;