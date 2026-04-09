import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Trophy, User as UserIcon, Medal } from 'lucide-react';
import { getTitleData } from '../utils/titles';
import { useAuth } from '../context/AuthContext';

export default function Leaderboard() {
  const { currentUser } = useAuth();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query the top 20 users by current streak
    const q = query(
      collection(db, 'users'), 
      orderBy('currentStreak', 'desc'), 
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const topUsers = [];
      snapshot.forEach((doc) => {
        topUsers.push({ id: doc.id, ...doc.data() });
      });
      setLeaders(topUsers);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (loading) return <div className="text-white text-center mt-20">Loading ranks...</div>;

  return (
    <div className="flex flex-col items-center h-full space-y-6 pb-24 overflow-y-auto hide-scrollbar">
      
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-3xl font-light text-white tracking-widest flex items-center justify-center space-x-3">
          <Trophy className="text-yellow-400" size={28} />
          <span>GLOBAL RANKS</span>
        </h1>
        <p className="text-indigo-300 text-sm mt-1">Top streaks of all time</p>
      </div>

      {/* Leaderboard List */}
      <div className="w-full max-w-sm space-y-3">
        {leaders.map((user, index) => {
          const title = getTitleData(user.equippedTitle);
          const isMe = currentUser?.uid === user.id;
          const rank = index + 1;

          return (
            <div 
              key={user.id} 
              className={`flex items-center p-4 rounded-2xl backdrop-blur-xl border transition-all ${
                isMe 
                  ? 'bg-indigo-500/20 border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Rank Number / Medal */}
              <div className="w-8 flex justify-center mr-3">
                {rank === 1 ? <Medal className="text-yellow-400" size={24} /> : 
                 rank === 2 ? <Medal className="text-slate-300" size={24} /> :
                 rank === 3 ? <Medal className="text-amber-600" size={24} /> : 
                 <span className="text-slate-400 font-bold text-lg">{rank}</span>}
              </div>

              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 bg-slate-800 flex-shrink-0 flex items-center justify-center mr-4">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-slate-500" />
                )}
              </div>

              {/* Name and Title */}
              <div className="flex-grow min-w-0">
                <h3 className="text-white font-medium truncate">{user.displayName || 'Zen User'}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r ${title.gradient} bg-clip-text text-transparent`}>
                  {title.name}
                </span>
              </div>

              {/* Streak Score */}
              <div className="flex flex-col items-end ml-2">
                <span className="text-2xl font-light text-white leading-none">{user.currentStreak || 0}</span>
                <span className="text-[10px] text-indigo-300 uppercase tracking-wider">Days</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}