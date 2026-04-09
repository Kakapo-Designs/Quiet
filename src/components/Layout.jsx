import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, User, Trophy, Users } from 'lucide-react'; // Added Users icon

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Focus' },
    { path: '/social', icon: Users, label: 'Social' }, // New Social Tab
    { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
<div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white font-sans pb-24 relative">
      
      {/* UPDATED: Ensure main content uses dvh minus nav space */}
      <main className="container mx-auto px-4 h-[calc(100dvh-90px)] pt-8 overflow-y-auto hide-scrollbar">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full px-6 py-5 z-50">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] flex justify-around items-center p-3 shadow-2xl max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${
                  isActive ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />
              </Link>
            );
          })}
        </div>
      </nav>
      
    </div>
  );
}