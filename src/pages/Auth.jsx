import { useState } from 'react';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 1. Create account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Create base document with onboarding flag
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          onboardingCompleted: false, // This triggers the new flow
          photoURL: '',
          currentStreak: 0,
          longestStreak: 0,
          unlockedTitles: ['novice'],
          equippedTitle: 'novice',
          friends: [],
          lastMeditationDate: null
        });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-12 animate-fade-in">
      {/* Quiet Branding */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto bg-white/5 rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-6">
           <div className="w-6 h-6 bg-indigo-400 rounded-full animate-pulse"></div>
        </div>
        <h1 className="text-5xl font-light text-white tracking-[0.2em] mb-2">QUIET</h1>
        <p className="text-slate-400 font-light tracking-widest text-sm">FIND YOUR CENTER</p>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email Address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/20 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all font-light"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black/20 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-black/40 transition-all font-light"
          />
          
          {error && <p className="text-red-400/80 text-xs text-center font-light">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-500/80 hover:bg-indigo-500 text-white font-light tracking-widest py-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-50"
          >
            {isLoading ? '...' : isLogin ? 'ENTER' : 'BEGIN'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-500 hover:text-white transition-colors text-xs tracking-widest uppercase"
          >
            {isLogin ? 'Create an account' : 'I already have an account'}
          </button>
        </div>
      </div>
    </div>
  );
}