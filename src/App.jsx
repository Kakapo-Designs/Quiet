import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding'; // <-- Add this import
import Social from './pages/Social';

function ProtectedRoute({ children }) {
  const { currentUser, userData } = useAuth();
  
  if (!currentUser) return <Navigate to="/auth" />;
  
  // If they are logged in but haven't finished onboarding, force them there
  if (userData && userData.onboardingCompleted === false) {
    return <Navigate to="/onboarding" />;
  }
  
  return children;
}

function AppRoutes() {
  const { currentUser, userData } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={currentUser ? <Navigate to="/" /> : <Auth />} />
      
      {/* Protect the onboarding route so only logged in, incomplete users can see it */}
      <Route 
        path="/onboarding" 
        element={
          (!currentUser) ? <Navigate to="/auth" /> : 
          (userData?.onboardingCompleted) ? <Navigate to="/" /> : 
          <Onboarding />
        } 
      />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/social" element={<Social />} />       
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>

      <Route path="*" element={<Navigate to={currentUser ? "/" : "/auth"} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;