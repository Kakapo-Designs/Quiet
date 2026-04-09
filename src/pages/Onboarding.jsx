import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowRight, Check, Zap, Heart, Users, Flame, Infinity as InfinityIcon } from 'lucide-react';

export default function Onboarding() {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goalMinutes, setGoalMinutes] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: name,
        dailyGoalMinutes: goalMinutes,
        onboardingCompleted: true 
      });
    } catch (err) {
      console.error("Error saving setup:", err);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      
      {/* Progress Indicator */}
      <div className="absolute top-12 flex space-x-2">
        {[1, 2, 3, 4, 5].map(dot => (
          <div key={dot} className={`w-2 h-2 rounded-full transition-all duration-500 ${step === dot ? 'bg-indigo-400 w-6' : step > dot ? 'bg-indigo-500/50' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="w-full max-w-md relative min-h-[450px] flex flex-col items-center justify-center">
        
        {/* Step 1: Identity */}
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
              className="mt-8 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full p-4 transition-all disabled:opacity-0 shadow-[0_0_20px_rgba(99,102,241,0.2)] mx-auto block"
            >
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Step 2: Intention */}
        {step === 2 && (
          <div className="w-full animate-slide-up text-center space-y-8">
            <h2 className="text-3xl font-light text-white tracking-wide">Set your daily target.</h2>
            <p className="text-slate-400 font-light text-sm">How many minutes will you commit to each day? You can always do more.</p>
            <div className="grid grid-cols-2 gap-3 pt-4">
              {[5, 10, 15, 30].map(min => (
                <button 
                  key={min}
                  onClick={() => setGoalMinutes(min)}
                  className={`py-5 rounded-2xl border transition-all ${
                    goalMinutes === min 
                      ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl font-light block mb-1">{min}</span>
                  <span className="text-[10px] tracking-widest uppercase">Minutes</span>
                </button>
              ))}
            </div>
            <button onClick={handleNext} className="mt-8 bg-indigo-500 hover:bg-indigo-400 text-white rounded-full p-4 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] mx-auto block">
              <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Step 3: Tutorial - The Engine */}
        {step === 3 && (
          <div className="w-full animate-slide-up text-center space-y-6">
            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl mb-4">
               <div className="flex justify-center mb-4">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="226" strokeDashoffset="80" className="text-indigo-400" />
                    </svg>
                    <Zap className="text-indigo-300" size={24} />
                  </div>
               </div>
               <h3 className="text-white font-medium mb-2 uppercase tracking-widest text-sm">Fill the Ring, Earn XP</h3>
               <p className="text-slate-400 font-light text-xs leading-relaxed">
                 Your dashboard timer tracks your progress. Every minute meditated earns you 10 Zen XP. Level up your profile and unlock cosmetic titles by building your streak.
               </p>
            </div>
            <button onClick={handleNext} className="w-full bg-white/10 hover:bg-white/20 text-white rounded-2xl p-4 transition-all uppercase tracking-widest font-light text-sm">
              Understood
            </button>
          </div>
        )}

        {/* Step 4: Tutorial - Social & Vibes */}
        {step === 4 && (
          <div className="w-full animate-slide-up text-center space-y-6">
            <div className="bg-white/[0.03] border border-white/10 p-6 rounded-3xl mb-4 text-left">
               <div className="flex items-center justify-between bg-black/40 p-4 rounded-2xl mb-4">
                 <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center"><Users size={16} className="text-indigo-400"/></div>
                   <span className="text-white font-light text-sm">Accountability</span>
                 </div>
                 <Heart className="text-pink-400 fill-pink-400/20" size={20} />
               </div>
               <h3 className="text-white font-medium mb-2 uppercase tracking-widest text-sm text-center">Share the Journey</h3>
               <p className="text-slate-400 font-light text-xs leading-relaxed text-center">
                 Add friends using your unique 6-digit code. Send them daily "Vibes" (the heart icon) to encourage them to reach their goals.
               </p>
            </div>
            <button onClick={handleNext} className="w-full bg-white/10 hover:bg-white/20 text-white rounded-2xl p-4 transition-all uppercase tracking-widest font-light text-sm">
              I'm Ready
            </button>
          </div>
        )}

        {/* Step 5: Launch */}
        {step === 5 && (
          <div className="w-full animate-slide-up text-center space-y-8 mt-10">
            <div className="w-24 h-24 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
               <Check size={48} className="text-indigo-400" />
            </div>
            <h2 className="text-3xl font-light text-white tracking-wide">Your space is prepared.</h2>
            <p className="text-slate-400 font-light text-sm">
              Find a quiet place, sit comfortably, and let's begin.
            </p>
            
            <button 
              onClick={handleFinish}
              disabled={isSaving}
              className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-light tracking-[0.2em] py-5 rounded-2xl transition-all uppercase mt-8 shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
            >
              {isSaving ? 'Entering...' : 'Enter Quiet'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}