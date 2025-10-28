import { useState, useEffect } from 'react';
import { StoreFront } from './components/StoreFront';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './utils/supabase/client';
import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [view, setView] = useState<'store' | 'admin'>('store');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    checkExistingSession();
    
    // Add keyboard shortcut for admin access (Ctrl+Shift+A)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setView('admin');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const checkExistingSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        setView('admin');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLogin = (token: string) => {
    setAccessToken(token);
    setView('admin');
  };

  const handleLogout = () => {
    setAccessToken(null);
    setView('store');
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="relative">
        {/* Main Content */}
        {view === 'store' ? (
          <StoreFront onAdminAccess={() => setView('admin')} />
        ) : accessToken ? (
          <AdminDashboard accessToken={accessToken} onLogout={handleLogout} />
        ) : (
          <AdminLogin onLogin={handleLogin} onBack={() => setView('store')} />
        )}
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
