import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { LogOut, Upload, User as UserIcon, Users, UserPlus, Check, X, Copy, Search } from 'lucide-react';
import { TITLES, getTitleData } from '../utils/titles';

export default function Profile() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('journey'); // 'journey' or 'social'
  
  // Social States
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState(''); // 'loading', 'success', 'error'
  const [searchMessage, setSearchMessage] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);

  // Setup & Upload States
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // 1. Listen to Current User Data & Auto-Generate Friend Code
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Auto-generate Friend Code if missing (Retroactive fix)
        if (!data.friendCode) {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(doc(db, 'users', currentUser.uid), { 
            friendCode: newCode,
            friendRequests: []
          });
        }
        setUserData(data);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 2. Fetch Friends and Requests Data when userData changes
  useEffect(() => {
    if (!userData) return;

    const fetchSocialData = async () => {
      // Fetch Accepted Friends
      if (userData.friends && userData.friends.length > 0) {
        const friendsData = await Promise.all(
          userData.friends.map(async (uid) => {
            const fDoc = await getDoc(doc(db, 'users', uid));
            return { id: fDoc.id, ...fDoc.data() };
          })
        );
        setFriendsList(friendsData);
      } else {
        setFriendsList([]);
      }

      // Fetch Pending Requests
      if (userData.friendRequests && userData.friendRequests.length > 0) {
        const requestsData = await Promise.all(
          userData.friendRequests.map(async (uid) => {
            const rDoc = await getDoc(doc(db, 'users', uid));
            return { id: rDoc.id, ...rDoc.data() };
          })
        );
        setRequestsList(requestsData);
      } else {
        setRequestsList([]);
      }
    };

    fetchSocialData();
  }, [userData?.friends, userData?.friendRequests]);

  // --- HANDLERS ---

  const handleLogout = async () => signOut(auth);

  const handleImageUpload = async (e) => { /* Same as before */
    const file = e.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024) return alert("File too large (Max 2MB).");
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: reader.result });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleEquipTitle = async (titleId) => {
    await updateDoc(doc(db, 'users', currentUser.uid), { equippedTitle: titleId });
  };

  // --- SOCIAL LOGIC ---

  const copyFriendCode = () => {
    navigator.clipboard.writeText(userData.friendCode);
    setSearchMessage('Code copied!');
    setTimeout(() => setSearchMessage(''), 2000);
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    
    const code = searchCode.toUpperCase();
    if (code === userData.friendCode) {
      setSearchStatus('error');
      setSearchMessage("You cannot add yourself.");
      return;
    }

    setSearchStatus('loading');
    try {
      const q = query(collection(db, 'users'), where('friendCode', '==', code));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setSearchStatus('error');
        setSearchMessage("User not found.");
        return;
      }

      const targetUser = snapshot.docs[0];
      const targetData = targetUser.data();

      if (userData.friends?.includes(targetUser.id)) {
        setSearchStatus('error');
        setSearchMessage("You are already friends.");
        return;
      }

      if (targetData.friendRequests?.includes(currentUser.uid)) {
        setSearchStatus('error');
        setSearchMessage("Request already sent.");
        return;
      }

      // Add my UID to their friendRequests array
      await updateDoc(doc(db, 'users', targetUser.id), {
        friendRequests: arrayUnion(currentUser.uid)
      });

      setSearchStatus('success');
      setSearchMessage("Request sent!");
      setSearchCode('');
    } catch (err) {
      setSearchStatus('error');
      setSearchMessage("An error occurred.");
    }
  };

  const handleAcceptRequest = async (targetUid) => {
    // Add to each other's friends list, remove from requests
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion(targetUid),
      friendRequests: arrayRemove(targetUid)
    });
    await updateDoc(doc(db, 'users', targetUid), {
      friends: arrayUnion(currentUser.uid)
    });
  };

  const handleDeclineRequest = async (targetUid) => {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friendRequests: arrayRemove(targetUid)
    });
  };


  if (!userData) return <div className="text-white text-center mt-20 font-light">Loading profile...</div>;
  const activeTitle = getTitleData(userData.equippedTitle);

  return (
    <div className="flex flex-col items-center h-full space-y-6 pb-24 overflow-y-auto hide-scrollbar animate-fade-in">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center max-w-sm pt-4">
        <h1 className="text-3xl font-light text-white tracking-[0.2em]">PROFILE</h1>
        <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors">
          <LogOut size={24} />
        </button>
      </div>


      {/* --- TAB CONTENT: JOURNEY --- */}
      {activeTab === 'journey' && (
        <div className="w-full max-w-sm space-y-6 animate-slide-up">
          {/* Identity Card */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center relative">
            <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current.click()}>
              <div className="w-32 h-32 rounded-full overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                {userData.photoURL ? (
                  <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={48} className="text-slate-600" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="text-white mb-1" size={20} />
                <span className="text-white text-xs font-light tracking-widest">EDIT</span>
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/80 rounded-full flex items-center justify-center">
                  <span className="text-indigo-400 text-xs animate-pulse tracking-widest">SAVING...</span>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

            <h2 className="text-2xl font-light text-white mb-1">{userData.displayName || 'Zen User'}</h2>
            <div className={`px-4 py-1 rounded-full bg-gradient-to-r ${activeTitle.gradient} shadow-lg mb-6 opacity-90`}>
              <span className="text-white text-xs font-bold tracking-widest uppercase">{activeTitle.name}</span>
            </div>

            <div className="flex w-full justify-around bg-black/20 rounded-2xl p-4 border border-white/5">
              <div className="text-center">
                <p className="text-3xl font-light text-white">{userData.currentStreak || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Day Streak</p>
              </div>
              <div className="w-px bg-white/5"></div>
              <div className="text-center">
                <p className="text-3xl font-light text-white">{userData.longestStreak || 0}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Best Streak</p>
              </div>
            </div>
          </div>

          {/* Cosmetics */}
          <div className="space-y-4">
            <h3 className="text-xs font-light text-slate-500 uppercase tracking-widest pl-2">Unlocked Titles</h3>
            <div className="space-y-3">
              {TITLES.map((title) => {
                const isUnlocked = userData.unlockedTitles?.includes(title.id);
                const isEquipped = userData.equippedTitle === title.id;
                return (
                  <button
                    key={title.id}
                    onClick={() => isUnlocked && handleEquipTitle(title.id)}
                    disabled={!isUnlocked}
                    className={`w-full flex flex-col p-5 rounded-2xl border transition-all duration-300 text-left ${
                      isEquipped ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                      : isUnlocked ? 'bg-white/[0.02] border-white/5 hover:bg-white/5' 
                      : 'bg-black/20 border-transparent opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-medium uppercase tracking-widest text-sm bg-gradient-to-r ${title.gradient} bg-clip-text text-transparent`}>
                        {title.name}
                      </span>
                      {isEquipped && <span className="text-[10px] text-indigo-300 tracking-widest uppercase">Equipped</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-light mt-1">{title.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      

    </div>
  );
}