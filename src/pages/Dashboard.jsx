import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Play, Pause, Square, Check, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  // States
  const [status, setStatus] = useState('idle'); // idle, running, paused, confirm_quit, completed
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(selectedMinutes * 60);
  const [rewardData, setRewardData] = useState({ streak: 0, message: '', unlocked: [] });

  // Time Formatting
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Timer Logic
  useEffect(() => {
    let interval;
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (status === 'running' && timeLeft === 0) {
      handleSessionEnd(true);
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  useEffect(() => {
    if (status === 'idle') setTimeLeft(selectedMinutes * 60);
  }, [selectedMinutes, status]);

  const handleStart = () => setStatus('running');
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');

  // Trigger the tactile confetti burst
  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#818cf8', '#c084fc', '#ffffff'] // Quiet branding colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#818cf8', '#c084fc', '#ffffff']
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  // Database & Gamification Engine
  const handleSessionEnd = async (completed) => {
    setStatus(completed ? 'completed' : 'idle');
    const minutesCompleted = completed ? selectedMinutes : Math.round((selectedMinutes * 60 - timeLeft) / 60);

    try {
      // 1. Log the session
      await addDoc(collection(db, 'sessions'), {
        userId: currentUser.uid,
        date: new Date(),
        durationMinutes: minutesCompleted,
        completed: completed
      });

      if (completed) {
        // 2. Fetch current user stats to calculate streaks
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        let newStreak = userData.currentStreak || 0;
        const now = new Date();
        const lastDate = userData.lastMeditationDate ? userData.lastMeditationDate.toDate() : null;
        
        // Date math to check if they meditated yesterday, today, or missed a day
        if (lastDate) {
          const hoursSinceLast = (now - lastDate) / (1000 * 60 * 60);
          if (hoursSinceLast > 24 && hoursSinceLast < 48) {
            newStreak += 1; // Meditated yesterday
          } else if (hoursSinceLast >= 48) {
            newStreak = 1; // Missed a day, reset
          }
          // If hoursSinceLast < 24, they already meditated today, streak stays the same.
        } else {
          newStreak = 1; // First time meditating
        }

        const newLongest = Math.max(newStreak, userData.longestStreak || 0);
        
        // 3. Check for Title Unlocks
        let unlocked = [...(userData.unlockedTitles || ['novice'])];
        let newUnlocks = [];
        
        if (newStreak >= 3 && !unlocked.includes('mindful')) {
          unlocked.push('mindful');
          newUnlocks.push('Mindful Soul');
        }
        if (newStreak >= 30 && !unlocked.includes('zen_master')) {
          unlocked.push('zen_master');
          newUnlocks.push('Zen Master');
        }
        if (minutesCompleted >= 60 && !unlocked.includes('void_walker')) {
          unlocked.push('void_walker');
          newUnlocks.push('Void Walker');
        }

        // 4. Determine Encouragement Message
        let msg = "Peace achieved.";
        if (newStreak === 3) msg = "Three days in a row! You're building a habit.";
        if (newStreak === 7) msg = "One full week. Incredible dedication.";
        if (newStreak > 7 && newStreak % 5 === 0) msg = `Unstoppable! ${newStreak} days of focus.`;
        if (newUnlocks.length > 0) msg = `Title Unlocked: ${newUnlocks[0]}!`;

        setRewardData({ streak: newStreak, message: msg, unlocked: newUnlocks });

        // 5. Update User Profile in DB
        await updateDoc(userRef, {
          currentStreak: newStreak,
          longestStreak: newLongest,
          unlockedTitles: unlocked,
          lastMeditationDate: now
        });

        // 6. Celebrate!
        fireConfetti();
      } else {
        setTimeLeft(selectedMinutes * 60);
      }
    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setTimeLeft(selectedMinutes * 60);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 animate-fade-in">
      
      {/* Dynamic Header */}
      <div className="text-center">
        <h1 className="text-3xl font-light text-white tracking-[0.2em] mb-2">
          {status === 'idle' && "READY"}
          {(status === 'running' || status === 'paused') && "FOCUS"}
          {status === 'confirm_quit' && "END EARLY?"}
          {status === 'completed' && "COMPLETE"}
        </h1>
      </div>

      {/* Main Container */}
      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] shadow-2xl w-full max-w-sm flex flex-col items-center justify-center min-h-[420px] transition-all duration-500 relative overflow-hidden">
        
        {status === 'running' && (
          <div className="absolute inset-0 bg-indigo-500/5 animate-pulse rounded-[3rem] pointer-events-none"></div>
        )}

        {/* --- REWARD SCREEN --- */}
        {status === 'completed' ? (
          <div className="flex flex-col items-center text-center animate-slide-up w-full">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1 rounded-full mb-6 shadow-[0_0_30px_rgba(129,140,248,0.5)]">
               <div className="bg-slate-900 p-5 rounded-full">
                  <Check size={48} className="text-indigo-400" />
               </div>
            </div>
            
            <h2 className="text-2xl text-white font-light tracking-wide mb-2">{rewardData.message}</h2>
            
            <div className="flex items-center space-x-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl mt-6 mb-8">
              <Flame className="text-orange-400" size={24} />
              <div className="text-left">
                <p className="text-white text-xl font-medium leading-none">{rewardData.streak}</p>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest">Day Streak</p>
              </div>
            </div>

            <button 
              onClick={handleReset}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-light tracking-widest py-4 rounded-2xl transition-all uppercase"
            >
              Continue
            </button>
          </div>
        ) : (
          /* --- TIMER SCREEN --- */
          <>
            <div className={`text-7xl font-light tracking-tighter transition-all duration-500 ${status === 'running' ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'text-slate-400'} mb-10`}>
              {formatTime(timeLeft)}
            </div>

            {status === 'idle' && (
              <div className="flex flex-col items-center space-y-8 w-full">
                <select 
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                  className="bg-black/20 border border-white/5 text-white rounded-xl px-6 py-3 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-center w-3/4 font-light tracking-wide cursor-pointer"
                >
                  <option value={1} className="text-black">1 Minute</option>
                  <option value={5} className="text-black">5 Minutes</option>
                  <option value={10} className="text-black">10 Minutes</option>
                  <option value={15} className="text-black">15 Minutes</option>
                  <option value={30} className="text-black">30 Minutes</option>
                  <option value={60} className="text-black">60 Minutes</option>
                </select>

                <button 
                  onClick={handleStart}
                  className="w-full bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-[2rem] py-5 text-lg font-light tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center space-x-3"
                >
                  <Play fill="currentColor" size={20} />
                  <span>Begin</span>
                </button>
              </div>
            )}

            {(status === 'running' || status === 'paused') && (
              <div className="flex space-x-6 w-full justify-center">
                {status === 'running' ? (
                  <button onClick={handlePause} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white p-6 rounded-full transition-all">
                    <Pause fill="currentColor" size={28} />
                  </button>
                ) : (
                  <button onClick={handleResume} className="bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 p-6 rounded-full transition-all">
                    <Play fill="currentColor" size={28} />
                  </button>
                )}
                
                <button onClick={() => setStatus('confirm_quit')} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-6 rounded-full transition-all">
                  <Square fill="currentColor" size={28} />
                </button>
              </div>
            )}

            {status === 'confirm_quit' && (
              <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
                <p className="text-slate-400 text-center text-sm font-light leading-relaxed px-4">
                  Are you sure you want to end early?<br/>This session won't count towards your streak.
                </p>
                <div className="flex space-x-4 w-full">
                  <button onClick={() => handleSessionEnd(false)} className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 py-4 rounded-2xl transition-all font-light tracking-wide">
                    End
                  </button>
                  <button onClick={() => setStatus('paused')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl transition-all font-light tracking-wide">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}