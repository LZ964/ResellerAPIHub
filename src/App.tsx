/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth';
import Layout from './components/Layout';
import DomainReseller from './components/DomainReseller';
import SSLReseller from './components/SSLReseller';
import EmailReseller from './components/EmailReseller';
import AIAssistant from './components/AIAssistant';
import AIBrainstorm from './components/AIBrainstorm';
import ProfileCompliance from './components/ProfileCompliance';
import Documentation from './components/Documentation';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
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
    </Router>
  );
}

