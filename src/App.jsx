import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Auth from './pages/Auth';

// A helper component to protect routes
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/auth" />;
  return children;
}

// The main routing logic extracted into a child so it can use the Auth context
function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* If logged in, send them to dashboard. If not, show auth. */}
      <Route path="/auth" element={currentUser ? <Navigate to="/" /> : <Auth />} />
      
      {/* Protected Routes wrapped in our Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>

      {/* Catch-all */}
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