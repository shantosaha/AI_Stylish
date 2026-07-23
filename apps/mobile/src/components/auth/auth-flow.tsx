import { useState } from 'react';

import { LoginScreen } from '@/components/auth/login-screen';
import { SignupScreen } from '@/components/auth/signup-screen';

export function AuthFlow() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return mode === 'login' ? (
    <LoginScreen onSwitchToSignup={() => setMode('signup')} />
  ) : (
    <SignupScreen onSwitchToLogin={() => setMode('login')} />
  );
}
