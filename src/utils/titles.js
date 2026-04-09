export const TITLES = [
  { 
    id: 'novice', 
    name: 'Novice', 
    gradient: 'from-slate-400 to-slate-500',
    description: 'Begin your journey.'
  },
  { 
    id: 'mindful', 
    name: 'Mindful Soul', 
    gradient: 'from-emerald-400 to-cyan-500',
    description: 'Meditate for 3 days in a row.'
  },
  { 
    id: 'zen_master', 
    name: 'Zen Master', 
    gradient: 'from-purple-400 to-pink-500',
    description: 'Achieve a 30-day streak.'
  },
  { 
    id: 'void_walker', 
    name: 'Void Walker', 
    gradient: 'from-gray-700 via-gray-900 to-black',
    description: 'Meditate for 60 minutes in one session.'
  }
];

export const getTitleData = (titleId) => {
  return TITLES.find(t => t.id === titleId) || TITLES[0];
};