import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, User, Trophy } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Focus' },
    { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    // Global dark, calming gradient background
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white font-sans pb-20">
      
      {/* Main Content Area */}
      <main className="container mx-auto px-4 h-[calc(100vh-80px)] pt-8">
        <Outlet />
      </main>

      {/* Mobile-First Bottom Navigation (Glassmorphism) */}
      <nav className="fixed bottom-0 w-full px-6 py-4 z-50">
        <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-full flex justify-around items-center p-3 shadow-2xl max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex flex-col items-center p-2 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-white/20 text-indigo-300 scale-110 shadow-inner' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              </Link>
            );
          })}
        </div>
      </nav>
      
    </div>
  );
}