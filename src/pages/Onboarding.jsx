import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, Check } from 'lucide-react';

export default function Onboarding() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goalMinutes, setGoalMinutes] = useState(10);
  const [streakGoal, setStreakGoal] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: name,
        dailyGoalMinutes: goalMinutes,
        targetStreak: streakGoal,
        onboardingCompleted: true // This will automatically route them to the Dashboard
      });
    } catch (err) {
      console.error("Error saving setup:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-md relative min-h-[400px] flex flex-col items-center justify-center">
        
        {/* Step 1: Name */}
        {step === 1 && (
          <div className="w-full animate-slide-up text-center space-y-8">
            <h2 className="text-3xl font-light text-white tracking-wide">Welcome to Quiet.</h2>
            <p className="text-slate-400 font-light">What shall we call you?</p>
            <input 
              type="text" 
              autoFocus
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full bg-transparent border-b-2 border-white/20 text-center text-4xl text-white py-4 focus:outline-none focus:border-indigo-400 transition-colors font-light placeholder-slate-700"
            />
            <button 
              onClick={handleNext}
              disabled={!name.trim()}
              className="mt-8 bg-white/10 hover:bg-white/20 text-white rounded-full p-4 transition-all disabled:opacity-0"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Step 2: Time Goal */}
        {step === 2 && (
          <div className="w-full animate-slide-up text-center space-y-8">
            <h2 className="text-3xl font-light text-white tracking-wide">Set your daily intention.</h2>
            <p className="text-slate-400 font-light">How many minutes will you focus each day?</p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              {[5, 10, 15, 20, 30, 60].map(min => (
                <button 
                  key={min}
                  onClick={() => setGoalMinutes(min)}
                  className={`py-4 rounded-2xl border transition-all ${
                    goalMinutes === min 
                      ? 'bg-indigo-500/20 border-indigo-400 text-white' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-2xl font-light block">{min}</span>
                  <span className="text-xs tracking-widest uppercase">Min</span>
                </button>
              ))}
            </div>
            <button onClick={handleNext} className="mt-8 bg-white/10 hover:bg-white/20 text-white rounded-full p-4 transition-all">
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Step 3: Streak Goal */}
        {step === 3 && (
          <div className="w-full animate-slide-up text-center space-y-8">
            <h2 className="text-3xl font-light text-white tracking-wide">Choose your milestone.</h2>
            <p className="text-slate-400 font-light">Building a habit takes consistency.</p>
            <div className="flex flex-col space-y-4 pt-4">
              {[
                { days: 3, label: 'The Spark', desc: 'A great starting point.' },
                { days: 7, label: 'The Rhythm', desc: 'One full week of focus.' },
                { days: 30, label: 'The Journey', desc: 'True habit formation.' }
              ].map(target => (
                <button 
                  key={target.days}
                  onClick={() => setStreakGoal(target.days)}
                  className={`p-5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    streakGoal === target.days 
                      ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <h3 className="text-white text-lg font-medium">{target.days} Days <span className="text-indigo-300 font-light text-sm ml-2">- {target.label}</span></h3>
                    <p className="text-slate-400 text-sm font-light mt-1">{target.desc}</p>
                  </div>
                  {streakGoal === target.days && <Check className="text-indigo-400" />}
                </button>
              ))}
            </div>
            <button onClick={handleNext} className="mt-8 bg-white/10 hover:bg-white/20 text-white rounded-full p-4 transition-all">
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Step 4: Tutorial & Finish */}
        {step === 4 && (
          <div className="w-full animate-slide-up text-center space-y-8">
            <div className="w-20 h-20 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center mb-6">
               <Check size={40} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-wide">You are ready, {name}.</h2>
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left space-y-4">
              <p className="text-slate-300 font-light text-sm">Quiet works simply:</p>
              <ul className="text-slate-400 font-light text-sm space-y-3">
                <li><strong className="text-white font-medium">1. Set your timer</strong> on the dashboard.</li>
                <li><strong className="text-white font-medium">2. Complete the session</strong> to advance your streak.</li>
                <li><strong className="text-white font-medium">3. Earn titles</strong> to display on the global ranks.</li>
              </ul>
            </div>
            <button 
              onClick={handleFinish}
              disabled={isSaving}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-light tracking-widest py-5 rounded-2xl transition-all uppercase mt-4"
            >
              {isSaving ? 'Entering Quiet...' : 'Begin Journey'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}