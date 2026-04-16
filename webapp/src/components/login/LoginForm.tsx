'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import GlowButton from '@/components/ui/GlowButton';

interface LoginFormProps {
  show: boolean;
}

const inputClass = `w-full px-4 py-3 rounded-xl bg-ez-navy-light/50 border border-ez-navy-light
                    text-ez-white placeholder-gray-500
                    focus:outline-none focus:border-ez-yellow focus:ring-1 focus:ring-ez-yellow/50
                    transition-all text-lg`;

export default function LoginForm({ show }: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [registrationSecret, setRegistrationSecret] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const supabase = createClient();

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      if (!registrationSecret || registrationSecret.length < 6) {
        setError('Registration secret must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Verify registration secret before creating account
      const secretRes = await fetch('/api/verify-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: registrationSecret }),
      });

      if (!secretRes.ok) {
        setError('Invalid registration secret. Contact your system administrator.');
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || 'User' },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess('Account created! Check your email to confirm, then sign in.');
      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
      setRegistrationSecret('');
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="w-full max-w-sm flex flex-col gap-4"
      initial={{ opacity: 0, y: 40 }}
      animate={show ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isSignUp ? 'signup' : 'login'}
          initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {isSignUp && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="Your name"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-400 uppercase tracking-wider" htmlFor="regSecret">
                  Registration Secret
                </label>
                <input
                  id="regSecret"
                  type="text"
                  value={registrationSecret}
                  onChange={(e) => setRegistrationSecret(e.target.value.toUpperCase())}
                  required
                  maxLength={12}
                  className={`${inputClass} tracking-[0.3em] font-mono text-center uppercase`}
                  placeholder="XXXXXX"
                />
                <p className="text-xs text-gray-500">
                  6-digit alphanumeric code from your system admin
                </p>
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400 uppercase tracking-wider" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400 uppercase tracking-wider" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="Enter password"
            />
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400 uppercase tracking-wider" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
                placeholder="Confirm password"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <motion.p
          className="text-red-400 text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.p>
      )}

      {success && (
        <motion.p
          className="text-green-400 text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {success}
        </motion.p>
      )}

      <GlowButton
        type="submit"
        variant="yellow"
        size="lg"
        disabled={loading}
        className="w-full mt-2"
      >
        {loading
          ? (isSignUp ? 'Creating Account...' : 'Authenticating...')
          : (isSignUp ? 'Create Account' : 'Access System')
        }
      </GlowButton>

      <button
        type="button"
        onClick={toggleMode}
        className="text-sm text-gray-400 hover:text-ez-yellow transition-colors text-center"
      >
        {isSignUp
          ? 'Already have an account? Sign in'
          : "Don't have an account? Create one"
        }
      </button>
    </motion.form>
  );
}
