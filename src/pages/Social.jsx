import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, updateDoc, collection, query, where, getDocs, getDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { Users, UserPlus, Check, X, Copy, User as UserIcon, Heart, Bell } from 'lucide-react';
import { getTitleData } from '../utils/titles';

export default function Social() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState(''); 
  const [searchMessage, setSearchMessage] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [vibeStatus, setVibeStatus] = useState({}); // Track which friends we just sent a vibe to

  // 1. Listen to Current User
  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (!data.friendCode || data.friendCode === 'UNDEFINED') {
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await updateDoc(doc(db, 'users', currentUser.uid), { 
            friendCode: newCode,
            friendRequests: data.friendRequests || [],
            inbox: data.inbox || [] // Initialize Inbox
          });
          data.friendCode = newCode; 
        }
        setUserData(data);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 2. Fetch Friends Data
  useEffect(() => {
    if (!userData) return;
    const fetchSocialData = async () => {
      if (userData.friends?.length > 0) {
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

      if (userData.friendRequests?.length > 0) {
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

  const copyFriendCode = () => {
    navigator.clipboard.writeText(userData?.friendCode || '');
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
      if (userData.friends?.includes(targetUser.id)) {
        setSearchStatus('error');
        setSearchMessage("You are already friends.");
        return;
      }
      if (targetUser.data().friendRequests?.includes(currentUser.uid)) {
        setSearchStatus('error');
        setSearchMessage("Request already sent.");
        return;
      }

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

  // --- GIFTS / VIBES LOGIC ---

  const handleSendVibe = async (targetFriend) => {
    // Prevent spam clicking
    if (vibeStatus[targetFriend.id]) return;

    // Show visual feedback immediately
    setVibeStatus(prev => ({ ...prev, [targetFriend.id]: true }));
    
    // Create a unique vibe object
    const newVibe = {
      id: Date.now().toString(),
      senderName: userData.displayName || 'A friend',
      message: 'sent you peaceful vibes.',
      timestamp: Date.now()
    };

    try {
      await updateDoc(doc(db, 'users', targetFriend.id), {
        inbox: arrayUnion(newVibe)
      });
      // Reset button after 3 seconds
      setTimeout(() => {
        setVibeStatus(prev => ({ ...prev, [targetFriend.id]: false }));
      }, 3000);
    } catch (err) {
      console.error("Failed to send vibe", err);
    }
  };

  const handleClearInboxMessage = async (messageObj) => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        inbox: arrayRemove(messageObj)
      });
    } catch (err) {
      console.error("Failed to clear message", err);
    }
  };

  if (!userData) return <div className="text-white text-center mt-20 font-light">Loading social...</div>;

  return (
    <div className="flex flex-col items-center h-full space-y-6 pb-24 overflow-y-auto hide-scrollbar animate-fade-in">
      
      <div className="w-full flex justify-between items-center max-w-sm pt-4">
        <h1 className="text-3xl font-light text-white tracking-[0.2em]">SOCIAL</h1>
      </div>

      <div className="w-full max-w-sm space-y-6">
        
        {/* Friend Code Display */}
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] flex flex-col items-center text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Your Friend Code</p>
          <div 
            onClick={copyFriendCode}
            className="flex items-center space-x-3 bg-black/40 px-6 py-3 rounded-xl border border-white/5 cursor-pointer hover:border-indigo-500/50 transition-colors group"
          >
            <span className="text-3xl font-light text-white tracking-[0.2em]">{userData.friendCode || '......'}</span>
            <Copy className="text-slate-500 group-hover:text-indigo-400 transition-colors" size={20} />
          </div>
          {searchMessage && searchStatus !== 'error' && searchStatus !== 'loading' && (
            <p className="text-indigo-400 text-xs mt-3 animate-fade-in">{searchMessage}</p>
          )}
        </div>

        {/* Inbox / Received Vibes */}
        {userData.inbox && userData.inbox.length > 0 && (
          <div className="space-y-3 animate-slide-up">
            <h3 className="text-xs font-light text-pink-400 uppercase tracking-widest pl-2 flex items-center">
              <Bell size={14} className="mr-2"/> Inbox
            </h3>
            {userData.inbox.map((msg) => (
              <div key={msg.id} className="flex items-center justify-between bg-pink-500/10 border border-pink-500/20 p-4 rounded-2xl animate-fade-in">
                <div>
                  <p className="text-white font-light text-sm">
                    <span className="font-medium text-pink-300">{msg.senderName}</span> {msg.message}
                  </p>
                </div>
                <button 
                  onClick={() => handleClearInboxMessage(msg)}
                  className="text-slate-500 hover:text-white transition-colors ml-4 p-2"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Friend Form */}
        <form onSubmit={handleSendRequest} className="relative">
          <input
            type="text"
            placeholder="ENTER FRIEND CODE"
            maxLength={6}
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
            className="w-full bg-black/20 border border-white/5 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all font-light tracking-widest uppercase text-sm"
          />
          <button 
            type="submit" 
            disabled={searchStatus === 'loading' || searchCode.length < 6}
            className="absolute right-2 top-2 bottom-2 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 rounded-xl px-4 transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <UserPlus size={18} />
          </button>
        </form>
        {searchStatus === 'error' && <p className="text-red-400/80 text-xs text-center font-light -mt-2">{searchMessage}</p>}

        {/* Pending Requests */}
        {requestsList.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-light text-indigo-400 uppercase tracking-widest pl-2 flex items-center"><Users size={14} className="mr-2"/> Pending Requests</h3>
            {requestsList.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden flex items-center justify-center">
                    {req.photoURL ? <img src={req.photoURL} alt="" className="w-full h-full object-cover"/> : <UserIcon size={20} className="text-slate-600"/>}
                  </div>
                  <span className="text-white font-light">{req.displayName}</span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleAcceptRequest(req.id)} className="bg-green-500/20 text-green-400 p-2 rounded-xl hover:bg-green-500/40 transition-colors"><Check size={20}/></button>
                  <button onClick={() => handleDeclineRequest(req.id)} className="bg-red-500/20 text-red-400 p-2 rounded-xl hover:bg-red-500/40 transition-colors"><X size={20}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List with Gifts */}
        <div className="space-y-3">
          <h3 className="text-xs font-light text-slate-500 uppercase tracking-widest pl-2">My Friends</h3>
          {friendsList.length === 0 ? (
            <div className="text-center py-8 bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-slate-500 font-light text-sm">It's quiet here.</p>
              <p className="text-slate-600 text-xs mt-1">Add a friend to share your journey.</p>
            </div>
          ) : (
            friendsList.map(friend => {
              const fTitle = getTitleData(friend.equippedTitle);
              const isSent = vibeStatus[friend.id];

              return (
                <div key={friend.id} className="flex items-center justify-between bg-white/[0.03] border border-white/5 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center z-10">
                      {friend.photoURL ? <img src={friend.photoURL} alt="" className="w-full h-full object-cover"/> : <UserIcon size={20} className="text-slate-600"/>}
                    </div>
                    <div className="z-10">
                      <p className="text-white font-light leading-tight mb-1">{friend.displayName}</p>
                      <span className={`text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r ${fTitle.gradient} bg-clip-text text-transparent`}>
                        {fTitle.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 z-10">
                    <div className="text-right">
                      <p className="text-2xl font-light text-white leading-none">{friend.currentStreak || 0}</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Streak</p>
                    </div>
                    
                    {/* The Send Vibe Button */}
                    <button 
                      onClick={() => handleSendVibe(friend)}
                      disabled={isSent}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isSent 
                          ? 'bg-pink-500/20 text-pink-400 scale-110 shadow-[0_0_15px_rgba(244,114,182,0.3)]' 
                          : 'bg-white/5 text-slate-400 hover:bg-pink-500/20 hover:text-pink-300'
                      }`}
                    >
                      <Heart size={18} className={isSent ? "fill-current" : ""} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

      </div>
    </div>
  );
}