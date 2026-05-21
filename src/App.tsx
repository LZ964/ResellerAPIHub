/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

// Lazy load components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Auth = lazy(() => import('./components/Auth'));
const Layout = lazy(() => import('./components/Layout'));
const DomainReseller = lazy(() => import('./components/DomainReseller'));
const SSLReseller = lazy(() => import('./components/SSLReseller'));
const EmailReseller = lazy(() => import('./components/EmailReseller'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const AIBrainstorm = lazy(() => import('./components/AIBrainstorm'));
const ProfileCompliance = lazy(() => import('./components/ProfileCompliance'));
const Documentation = lazy(() => import('./components/Documentation'));

const LoadingFallback = () => (
  <div className="h-full w-full flex items-center justify-center min-h-[400px]">
    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
      });
    } catch (err) {
      console.warn("Auth initialization failed. App works in preview mode with no backend. ", err);
      // Simulate loaded with no user
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route element={user ? <Layout user={user} /> : <Navigate to="/auth" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/domains" element={<DomainReseller />} />
            <Route path="/ssl" element={<SSLReseller />} />
            <Route path="/emails" element={<EmailReseller />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/brainstorm" element={<AIBrainstorm />} />
            <Route path="/profile" element={<ProfileCompliance />} />
            <Route path="/docs" element={<Documentation />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

