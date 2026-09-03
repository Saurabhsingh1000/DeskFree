import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AxiosError } from 'axios';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast('error', 'Passwords do not match', 'Please make sure both passwords are the same.');
      return;
    }
    if (password.length < 8) {
      showToast('error', 'Password too short', 'Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await signup(name, email, password);
      showToast('success', 'Account created!', 'Welcome to DeskFree. Book your first seat now.');
      navigate('/rooms');
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      showToast('error', 'Signup Failed', error.response?.data?.error ?? 'Could not create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-12">
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600/20 border border-brand-500/30 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-2">Join DeskFree and book your study space</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5" id="signup-form">
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-gray-300 mb-1.5">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                required
                minLength={2}
                autoComplete="name"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1.5">
                Email address
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
                autoComplete="email"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="input-field"
              />
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          passwordStrength >= level ? strengthColors[passwordStrength] : 'bg-surface-400'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength === 1 ? 'text-red-400' : passwordStrength === 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {strengthLabels[passwordStrength]} password
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
                Confirm password
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                autoComplete="new-password"
                className={`input-field ${confirmPassword && password !== confirmPassword ? 'border-red-500/50 focus:ring-red-500/50' : ''}`}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
              )}
            </div>

            <button
              id="signup-submit-btn"
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              disabled={isLoading || (!!confirmPassword && password !== confirmPassword)}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5">
            <p className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link to="/login" id="login-link" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
