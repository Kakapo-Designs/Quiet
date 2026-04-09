import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Play, Pause, Square, Check, Flame, Infinity as InfinityIcon, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);

  // Timer States
  const [status, setStatus] = useState('idle'); 
  const [selectedMinutes, setSelectedMinutes] = useState(10); // can be a number or 'unlimited'
  const [timeValue, setTimeValue] = useState(0); // Holds either timeLeft or timeElapsed
  const [rewardData, setRewardData] = useState({ streak: 0, message: '', xpEarned: 0 });

  // 1. Listen to User Data
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = new Date();
        const lastDate = data.lastMeditationDate ? data.lastMeditationDate.toDate() : null;
        const isSameDay = lastDate && lastDate.getDate() === now.getDate() && lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear();

        setUserData({
          ...data,
          todayMinutes: isSameDay ? (data.todayMinutes || 0) : 0,
          dailyGoalMinutes: data.dailyGoalMinutes || 10,
          totalXP: data.totalXP || 0
        });
        
        // Default to their target goal initially
        if (status === 'idle' && selectedMinutes === 10) setSelectedMinutes(data.dailyGoalMinutes || 10);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 2. The Universal Timer Engine (Handles Countdown AND Stopwatch)
  useEffect(() => {
    let interval;
    if (status === 'running') {
      interval = setInterval(() => {
        setTimeValue((prev) => selectedMinutes === 'unlimited' ? prev + 1 : prev - 1);
      }, 1000);
    }

    if (status === 'running' && selectedMinutes !== 'unlimited' && timeValue <= 0) {
      handleSessionEnd(true);
    }
    return () => clearInterval(interval);
  }, [status, timeValue, selectedMinutes]);

  // Reset timer when selecting a new block while idle
  useEffect(() => {
    if (status === 'idle') {
      setTimeValue(selectedMinutes === 'unlimited' ? 0 : selectedMinutes * 60);
    }
  }, [selectedMinutes, status]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return selectedMinutes === 'unlimited' ? `${m}:${s}` : `${m}:${s}`;
  };

  const fireConfetti = () => {
    const duration = 3000; const end = Date.now() + duration;
    const frame = () => {
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#818cf8', '#c084fc', '#ffffff'] });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#818cf8', '#c084fc', '#ffffff'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  const handleSessionEnd = async (completed) => {
    setStatus('completed');
    
    // Calculate minutes based on mode
    let minutesCompleted = 0;
    if (selectedMinutes === 'unlimited') {
      minutesCompleted = Math.floor(timeValue / 60);
    } else {
      minutesCompleted = completed ? selectedMinutes : Math.round((selectedMinutes * 60 - timeValue) / 60);
    }

    if (minutesCompleted === 0) {
      setStatus('idle');
      setTimeValue(selectedMinutes === 'unlimited' ? 0 : selectedMinutes * 60);
      return; 
    }

    const xpEarned = minutesCompleted * 10; // 10 XP per minute

    try {
      await addDoc(collection(db, 'sessions'), { userId: currentUser.uid, date: new Date(), durationMinutes: minutesCompleted, completed: completed || selectedMinutes === 'unlimited' });

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const dbData = userSnap.data();

      const now = new Date();
      const lastDate = dbData.lastMeditationDate ? dbData.lastMeditationDate.toDate() : null;
      const isSameDay = lastDate && lastDate.getDate() === now.getDate() && lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear();
      const isYesterday = lastDate && (now - lastDate) / (1000 * 60 * 60) > 24 && (now - lastDate) / (1000 * 60 * 60) < 48;

      let newStreak = dbData.currentStreak || 0;
      let newTodayMinutes = isSameDay ? (dbData.todayMinutes || 0) + minutesCompleted : minutesCompleted;
      let newTotalXP = (dbData.totalXP || 0) + xpEarned;

      if (!isSameDay) {
        if (isYesterday) newStreak += 1;
        else if (lastDate) newStreak = 1; 
        else newStreak = 1; 
      }

      let msg = "Peace achieved.";
      if (newTodayMinutes >= dbData.dailyGoalMinutes) msg = "Daily goal reached! Excellent work.";
      if (selectedMinutes === 'unlimited') msg = "Deep focus. Excellent journey.";

      setRewardData({ streak: newStreak, message: msg, xpEarned });
      fireConfetti();

      await updateDoc(userRef, {
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, dbData.longestStreak || 0),
        lastMeditationDate: now,
        todayMinutes: newTodayMinutes,
        totalXP: newTotalXP
      });

    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  if (!userData) return <div className="text-center text-white mt-20">Loading space...</div>;

  const ringRadius = 110;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressPercent = Math.min((userData.todayMinutes / userData.dailyGoalMinutes) * 100, 100);
  const ringOffset = ringCircumference - (progressPercent / 100) * ringCircumference;
  const minutesRemaining = Math.max(userData.dailyGoalMinutes - userData.todayMinutes, 0);

  // DYNAMIC GOAL BLOCKS (Scales based on user's personal goal)
  const goal = userData.dailyGoalMinutes;
  const dynamicBlocks = [
    { label: "Quick", val: Math.max(1, Math.round(goal * 0.25)), color: "text-slate-400" },
    { label: "Halfway", val: Math.max(2, Math.round(goal * 0.5)), color: "text-indigo-400" },
    { label: "Target", val: goal, color: "text-purple-400" },
    { label: "Infinity", val: 'unlimited', color: "text-pink-400" }
  ];

  return (
    <div className="flex flex-col items-center justify-start h-full space-y-6 pt-4 animate-fade-in pb-10">
      <div className="text-center">
        <h1 className="text-3xl font-light text-white tracking-[0.2em] mb-2 uppercase">
          {status === 'idle' ? "Focus" : status === 'running' ? "Breathe" : status === 'paused' ? "Paused" : status === 'confirm_quit' ? "End Early?" : "Complete"}
        </h1>
        {status === 'idle' && (
          <p className="text-slate-400 font-light text-sm tracking-wide">
            {minutesRemaining > 0 ? `${minutesRemaining} min left to reach your daily goal.` : "Daily goal achieved. Going for extra credit?"}
          </p>
        )}
      </div>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] shadow-2xl w-full max-w-sm flex flex-col items-center justify-center transition-all duration-500 relative overflow-hidden">
        {status === 'running' && <div className="absolute inset-0 bg-indigo-500/5 animate-pulse rounded-[3rem] pointer-events-none"></div>}

        {status === 'completed' ? (
          <div className="flex flex-col items-center text-center animate-slide-up w-full py-8">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1 rounded-full mb-6">
               <div className="bg-slate-900 p-5 rounded-full"><Check size={48} className="text-indigo-400" /></div>
            </div>
            <h2 className="text-2xl text-white font-light tracking-wide mb-2">{rewardData.message}</h2>
            
            <div className="flex w-full justify-around mt-6 mb-8">
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                <Flame className="text-orange-400" size={20} />
                <div className="text-left">
                  <p className="text-white font-medium leading-none">{rewardData.streak}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">Streak</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                <Zap className="text-yellow-400" size={20} />
                <div className="text-left">
                  <p className="text-white font-medium leading-none">+{rewardData.xpEarned}</p>
                  <p className="text-slate-400 text-[10px] uppercase tracking-widest">Zen XP</p>
                </div>
              </div>
            </div>

            <button onClick={() => setStatus('idle')} className="w-full bg-white/10 hover:bg-white/20 text-white font-light tracking-widest py-4 rounded-2xl uppercase">Continue</button>
          </div>
        ) : (
          <>
            <div className="relative flex items-center justify-center w-64 h-64 mb-8 mt-4">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none">
                <circle cx="128" cy="128" r={ringRadius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
                <circle cx="128" cy="128" r={ringRadius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={ringCircumference} strokeDashoffset={ringOffset} strokeLinecap="round" className={`transition-all duration-1000 ease-out ${progressPercent >= 100 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]' : 'text-indigo-500 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}/>
              </svg>
              <div className={`text-6xl font-light tracking-tighter transition-all duration-500 ${status === 'running' ? 'text-white' : 'text-slate-300'}`}>
                {formatTime(timeValue)}
              </div>
              {selectedMinutes === 'unlimited' && status === 'running' && <div className="absolute bottom-10 text-pink-400 animate-pulse"><InfinityIcon size={24} /></div>}
            </div>

            {status === 'idle' && (
              <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
                <div className="grid grid-cols-2 gap-3 w-full">
                  {dynamicBlocks.map((block, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedMinutes(block.val)}
                      className={`py-4 rounded-2xl border transition-all flex flex-col items-center justify-center space-y-1 ${
                        selectedMinutes === block.val ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-black/20 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      {block.val === 'unlimited' ? <InfinityIcon size={24} className={block.color} /> : <span className={`text-xl font-light leading-none ${selectedMinutes === block.val ? 'text-white' : block.color}`}>{block.val}</span>}
                      <span className="text-[10px] tracking-widest uppercase text-slate-500">{block.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setStatus('running')} className="w-full bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-[2rem] py-5 text-lg font-light tracking-widest uppercase shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center justify-center space-x-3 mt-2">
                  <Play fill="currentColor" size={20} /><span>Begin</span>
                </button>
              </div>
            )}

            {(status === 'running' || status === 'paused') && (
              <div className="flex space-x-6 w-full justify-center">
                {status === 'running' ? <button onClick={() => setStatus('paused')} className="bg-white/5 border border-white/10 text-white p-6 rounded-full"><Pause size={28} /></button> : <button onClick={() => setStatus('running')} className="bg-indigo-500/20 border border-indigo-500/50 text-indigo-300 p-6 rounded-full"><Play size={28} /></button>}
                <button onClick={() => selectedMinutes === 'unlimited' ? handleSessionEnd(true) : setStatus('confirm_quit')} className="bg-red-500/10 border border-red-500/30 text-red-400 p-6 rounded-full">
                  <Square fill="currentColor" size={28} />
                </button>
              </div>
            )}

            {status === 'confirm_quit' && (
              <div className="flex flex-col items-center space-y-6 w-full animate-fade-in">
                <p className="text-slate-400 text-center text-sm font-light px-4">End early? The minutes you've completed will still be saved.</p>
                <div className="flex space-x-4 w-full">
                  <button onClick={() => handleSessionEnd(false)} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 py-4 rounded-2xl">End</button>
                  <button onClick={() => setStatus('paused')} className="flex-1 bg-white/10 text-white py-4 rounded-2xl">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}