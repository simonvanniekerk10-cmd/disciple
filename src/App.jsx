import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Devotions from './pages/Devotions';
import BookCatchUp from './pages/BookCatchUp';
import Challenge from './pages/Challenge';
import ChallengeHistory from './pages/ChallengeHistory';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import SuperAdminPanel from './pages/SuperAdminPanel';
import JoinGroup from './pages/JoinGroup';
import Prayer from './pages/Prayer';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/join" element={<JoinGroup />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Home" element={<Home />} />
        <Route path="/Devotions" element={<Devotions />} />
        <Route path="/BookCatchUp" element={<BookCatchUp />} />
        <Route path="/Challenge" element={<Challenge />} />
        <Route path="/Prayer" element={<Prayer />} />
        <Route path="/AdminPanel" element={<AdminPanel />} />
        <Route path="/SuperAdminPanel" element={<SuperAdminPanel />} />
      </Route>
      <Route path="/ChallengeHistory" element={<ChallengeHistory />} />
      <Route path="/Settings" element={<Settings />} />
      <Route path="/join" element={<JoinGroup />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App