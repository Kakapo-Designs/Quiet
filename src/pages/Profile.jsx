import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { LogOut, Upload, User as UserIcon } from 'lucide-react';
import { TITLES, getTitleData } from '../utils/titles';

export default function Profile() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Listen to the user's Firestore document in real-time
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      setUserData(doc.data());
    });
    return () => unsub();
  }, [currentUser]);

  // Logout Function
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  // Base64 Image Upload Function
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Optional: Check file size (e.g., limit to 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large. Please choose an image under 2MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: base64String
        });
      } catch (err) {
        console.error("Error updating profile picture:", err);
        alert("Failed to upload image. It might be too large for the database.");
      }
      setIsUploading(false);
    };

    // Convert file to Base64 string
    reader.readAsDataURL(file);
  };

  // Equip Title Function
  const handleEquipTitle = async (titleId) => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        equippedTitle: titleId
      });
    } catch (err) {
      console.error("Error equipping title:", err);
    }
  };

  if (!userData) return <div className="text-white text-center mt-20">Loading profile...</div>;

  const activeTitle = getTitleData(userData.equippedTitle);

  return (
    <div className="flex flex-col items-center h-full space-y-6 pb-24 overflow-y-auto hide-scrollbar">
      
      {/* Header & Logout */}
      <div className="w-full flex justify-between items-center max-w-sm pt-4">
        <h1 className="text-3xl font-light text-white tracking-widest">PROFILE</h1>
        <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={24} />
        </button>
      </div>

      {/* Main Identity Card */}
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm flex flex-col items-center relative">
        
        {/* Avatar Upload (Base64) */}
        <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current.click()}>
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 bg-slate-800 flex items-center justify-center">
            {userData.photoURL ? (
              <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={48} className="text-slate-500" />
            )}
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Upload className="text-white mb-1" size={20} />
            <span className="text-white text-xs">Edit</span>
          </div>
          
          {isUploading && (
            <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
              <span className="text-white text-xs animate-pulse">Saving...</span>
            </div>
          )}
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          className="hidden" 
        />

        {/* Display Name & Equipped Title */}
        <h2 className="text-2xl font-medium text-white mb-1">{userData.displayName || 'Zen User'}</h2>
        <div className={`px-4 py-1 rounded-full bg-gradient-to-r ${activeTitle.gradient} shadow-lg mb-6`}>
          <span className="text-white text-sm font-bold tracking-wide uppercase">{activeTitle.name}</span>
        </div>

        {/* Stats Row */}
        <div className="flex w-full justify-around bg-white/5 rounded-2xl p-4 border border-white/10">
          <div className="text-center">
            <p className="text-3xl font-light text-white">{userData.currentStreak || 0}</p>
            <p className="text-xs text-indigo-300 uppercase tracking-wider">Day Streak</p>
          </div>
          <div className="w-px bg-white/10"></div>
          <div className="text-center">
            <p className="text-3xl font-light text-white">{userData.longestStreak || 0}</p>
            <p className="text-xs text-indigo-300 uppercase tracking-wider">Best Streak</p>
          </div>
        </div>
      </div>

      {/* Title Selection System (Rocket League Style) */}
      <div className="w-full max-w-sm space-y-4">
        <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-widest pl-2">Cosmetic Titles</h3>
        
        <div className="space-y-3">
          {TITLES.map((title) => {
            // Check if user owns the title (for now, we'll pretend they own 'novice' and 'mindful' for testing)
            // In a real app, you'd check: userData.unlockedTitles.includes(title.id)
            const isUnlocked = userData.unlockedTitles?.includes(title.id) || title.id === 'novice' || title.id === 'mindful'; 
            const isEquipped = userData.equippedTitle === title.id;

            return (
              <button
                key={title.id}
                onClick={() => isUnlocked && handleEquipTitle(title.id)}
                disabled={!isUnlocked}
                className={`w-full flex flex-col p-4 rounded-2xl border transition-all duration-300 text-left ${
                  isEquipped 
                    ? 'bg-white/20 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                    : isUnlocked 
                      ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                      : 'bg-black/20 border-transparent opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold uppercase tracking-wider bg-gradient-to-r ${title.gradient} bg-clip-text text-transparent`}>
                    {title.name}
                  </span>
                  {isEquipped && <span className="text-xs text-white bg-indigo-500 px-2 py-1 rounded-full">Equipped</span>}
                  {!isUnlocked && <span className="text-xs text-slate-500">Locked</span>}
                </div>
                <p className="text-xs text-slate-400">{title.description}</p>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}