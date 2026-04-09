import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Play, Pause, Square, X, Check } from 'lucide-react';

export default function Dashboard() {
  const { currentUser } = useAuth();
  
  // States: 'idle', 'running', 'paused', 'confirm_quit', 'completed'
  const [status, setStatus] = useState('idle');
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [timeLeft, setTimeLeft] = useState(selectedMinutes * 60);

  // Time Formatting Helper (e.g., 65 -> "01:05")
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // The Timer Engine
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

  // Update timer if they change the dropdown while idle
  useEffect(() => {
    if (status === 'idle') {
      setTimeLeft(selectedMinutes * 60);
    }
  }, [selectedMinutes, status]);

  const handleStart = () => setStatus('running');
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');
  
  // Database Write Function
  const handleSessionEnd = async (completed) => {
    setStatus(completed ? 'completed' : 'idle');
    
    // Calculate how many minutes they actually did if they quit early
    const minutesCompleted = completed 
      ? selectedMinutes 
      : Math.round((selectedMinutes * 60 - timeLeft) / 60);

    try {
      await addDoc(collection(db, 'sessions'), {
        userId: currentUser.uid,
        date: serverTimestamp(),
        durationMinutes: minutesCompleted,
        completed: completed
      });
      
      // If completed, reset timer for the next session after a short delay
      if (completed) {
        setTimeout(() => {
          setStatus('idle');
          setTimeLeft(selectedMinutes * 60);
        }, 3000); // Show success screen for 3 seconds
      } else {
        setTimeLeft(selectedMinutes * 60);
      }
    } catch (err) {
      console.error("Error saving session:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8">
      
      {/* Top Status Text */}
      <div className="text-center">
        <h1 className="text-3xl font-light text-white tracking-widest mb-2">
          {status === 'idle' && "READY TO FOCUS"}
          {(status === 'running' || status === 'paused') && "IN THE ZONE"}
          {status === 'confirm_quit' && "END EARLY?"}
          {status === 'completed' && "SESSION COMPLETE"}
        </h1>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-10 rounded-[3rem] shadow-2xl w-full max-w-sm flex flex-col items-center justify-center min-h-[400px] transition-all duration-500 relative overflow-hidden">
        
        {/* Background glow effect when running */}
        {status === 'running' && (
          <div className="absolute inset-0 bg-indigo-500/10 animate-pulse rounded-[3rem] pointer-events-none"></div>
        )}

        {status === 'completed' ? (
          <div className="flex flex-col items-center text-center animate-fade-in">
            <div className="bg-green-500/20 p-6 rounded-full mb-6">
              <Check size={64} className="text-green-400" />
            </div>
            <p className="text-xl text-white font-light">Peace achieved.</p>
            <p className="text-indigo-200 mt-2">Your progress is saved.</p>
          </div>
        ) : (
          <>
            {/* The Timer Display */}
            <div className={`text-7xl font-light tracking-tighter transition-all duration-500 ${status === 'running' ? 'text-white' : 'text-indigo-200'} mb-8`}>
              {formatTime(timeLeft)}
            </div>

            {/* Controls */}
            {status === 'idle' && (
              <div className="flex flex-col items-center space-y-6 w-full">
                <select 
                  value={selectedMinutes}
                  onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-400 appearance-none text-center w-32"
                >
                  <option value={1} className="text-black">1 min</option>
                  <option value={5} className="text-black">5 min</option>
                  <option value={10} className="text-black">10 min</option>
                  <option value={15} className="text-black">15 min</option>
                  <option value={30} className="text-black">30 min</option>
                  <option value={60} className="text-black">60 min</option>
                </select>

                <button 
                  onClick={handleStart}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white rounded-3xl py-6 text-xl font-medium shadow-lg hover:shadow-indigo-500/40 transition-all flex items-center justify-center space-x-2"
                >
                  <Play fill="currentColor" size={24} />
                  <span>Begin</span>
                </button>
              </div>
            )}

            {(status === 'running' || status === 'paused') && (
              <div className="flex space-x-6 w-full justify-center">
                {status === 'running' ? (
                  <button onClick={handlePause} className="bg-white/10 hover:bg-white/20 text-white p-6 rounded-full transition-all">
                    <Pause fill="currentColor" size={32} />
                  </button>
                ) : (
                  <button onClick={handleResume} className="bg-white/10 hover:bg-white/20 text-white p-6 rounded-full transition-all">
                    <Play fill="currentColor" size={32} />
                  </button>
                )}
                
                <button onClick={() => setStatus('confirm_quit')} className="bg-red-500/20 hover:bg-red-500/40 text-red-400 p-6 rounded-full transition-all">
                  <Square fill="currentColor" size={32} />
                </button>
              </div>
            )}

            {status === 'confirm_quit' && (
              <div className="flex flex-col items-center space-y-4 w-full animate-fade-in">
                <p className="text-indigo-200 text-center mb-2">Are you sure you want to end early? You will lose this session's streak progress.</p>
                <div className="flex space-x-4 w-full">
                  <button onClick={() => handleSessionEnd(false)} className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 py-3 rounded-xl transition-all font-medium">
                    End Session
                  </button>
                  <button onClick={() => setStatus('paused')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl transition-all font-medium">
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