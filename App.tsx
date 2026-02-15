
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { VerseData, AppState, View } from './types';

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all px-4 py-2 rounded-xl ${active ? 'text-amber-400 scale-110' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <i className={`fa-solid ${icon} text-lg`}></i>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default function App() {
  const [activeView, setActiveView] = useState<View>('SEARCH');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [currentVerse, setCurrentVerse] = useState<VerseData | null>(null);
  const [savedVerses, setSavedVerses] = useState<VerseData[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [error, setError] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('sacred_verses');
    if (stored) {
      try { setSavedVerses(JSON.parse(stored)); } catch (e) { setSavedVerses([]); }
    }
  }, []);

  const saveToLocal = (verses: VerseData[]) => {
    localStorage.setItem('sacred_verses', JSON.stringify(verses));
    setSavedVerses(verses);
  };

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = (typeof searchQuery === 'string' ? searchQuery : query).trim();
    if (!finalQuery || state === AppState.SEARCHING) return;

    if (typeof searchQuery === 'string') setQuery(searchQuery);
    
    setState(AppState.SEARCHING);
    setError('');
    setCurrentVerse(null);
    stopAudio();
    
    try {
      const data = await geminiService.fetchVerseExplanation(finalQuery);
      if (!data) throw new Error("কোনো তথ্য পাওয়া যায়নি।");
      setCurrentVerse(data);
      setState(AppState.IDLE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'একটি সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      setState(AppState.ERROR);
    }
  };

  const toggleSave = () => {
    if (!currentVerse) return;
    const isSaved = savedVerses.find(v => v.reference === currentVerse.reference);
    if (isSaved) {
      saveToLocal(savedVerses.filter(v => v.reference !== currentVerse.reference));
    } else {
      saveToLocal([currentVerse, ...savedVerses]);
    }
  };

  const stopAudio = useCallback(() => {
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) {}
      audioSourceRef.current = null;
    }
    setIsReading(false);
  }, []);

  const handleRead = async () => {
    if (isReading) return stopAudio();
    if (!currentVerse) return;
    setIsReading(true);
    try {
      const buffer = await geminiService.readVerseAloud(currentVerse.text, selectedVoice);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsReading(false);
      audioSourceRef.current = source;
      source.start(0);
    } catch (e) { 
      setIsReading(false); 
      alert("অডিও প্লে করতে সমস্যা হচ্ছে। ব্রাউজারের অনুমতি চেক করুন।");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pb-32 md:pb-0">
      <header className="w-full max-w-5xl px-6 pt-10 pb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-900/40 rotate-3 transition-transform hover:rotate-0">
            <i className="fa-solid fa-music text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-amber-400 to-amber-100 tracking-tight">
              লিরিক্স বাণী AI
            </h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-[0.2em] opacity-60">Lyrical Reading App</p>
          </div>
        </div>
        <div className="hidden md:flex glass px-4 py-2 rounded-2xl gap-2">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <NavItem icon="fa-bookmark" label="সংরক্ষিত" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <NavItem icon="fa-gear" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </header>

      <main className="w-full max-w-5xl p-6">
        {activeView === 'SEARCH' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            {/* Search Box */}
            <div className="max-w-3xl mx-auto space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-amber-700/20 rounded-full blur opacity-0 group-focus-within:opacity-100 transition-all"></div>
                <div className="relative">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/50">
                    <i className="fa-solid fa-feather-pointed"></i>
                  </div>
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="গানের লিরিক্স বা বাণী লিখে খুঁজুন..."
                    className="w-full glass pl-14 pr-32 py-6 rounded-full text-lg outline-none focus:ring-4 ring-amber-500/10 transition-all placeholder-slate-500 text-white font-medium shadow-2xl"
                  />
                  <button 
                    type="submit"
                    disabled={state === AppState.SEARCHING}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-600 hover:bg-amber-500 text-white font-black px-8 py-3.5 rounded-full shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {state === AppState.SEARCHING ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    <span className="hidden sm:inline">খুঁজুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Loading Display */}
            {state === AppState.SEARCHING && (
              <div className="flex flex-col items-center py-20 gap-8">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-book-open-reader text-amber-500 text-2xl animate-pulse"></i>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-amber-500 font-bold text-2xl bn-serif animate-pulse mb-2">গভীর অর্থ বিশ্লেষণ করা হচ্ছে...</h3>
                  <p className="text-slate-500 text-sm tracking-widest uppercase">AI is analyzing the soul of the words</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {state === AppState.ERROR && (
              <div className="glass p-12 text-center rounded-[3rem] border-rose-500/20 max-w-2xl mx-auto shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-triangle-exclamation text-rose-500 text-4xl"></i>
                </div>
                <h3 className="text-white text-xl font-bold mb-3">তথ্য পাওয়া যায়নি</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-full text-white font-bold transition-all">আবার চেষ্টা করুন</button>
              </div>
            )}

            {/* Content Display */}
            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom-10 duration-1000">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-gradient-to-b from-amber-600/10 to-transparent rounded-[3rem] blur-2xl opacity-50"></div>
                  <div className="relative glass p-10 md:p-16 rounded-[3rem] border border-white/10 text-center overflow-hidden shadow-2xl">
                    <div className="absolute top-6 right-8 flex gap-3">
                      <button onClick={toggleSave} className={`w-12 h-12 flex items-center justify-center rounded-full glass hover:bg-white/10 transition-all ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400' : 'text-slate-400'}`}>
                        <i className="fa-solid fa-bookmark"></i>
                      </button>
                      <button onClick={handleRead} className={`w-12 h-12 flex items-center justify-center rounded-full glass hover:bg-white/10 transition-all ${isReading ? 'text-rose-500' : 'text-amber-500'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-circle-stop' : 'fa-circle-play text-xl'}`}></i>
                      </button>
                    </div>

                    <p className="text-amber-500/60 uppercase tracking-[0.4em] font-black text-xs mb-8">Original Content</p>
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 leading-[1.6] bn-serif italic px-4">
                      "{currentVerse.text}"
                    </h2>
                    <div className="inline-block px-8 py-3 bg-amber-600/20 rounded-2xl border border-amber-600/30">
                      <p className="text-amber-400 font-black tracking-widest text-lg">— {currentVerse.reference} —</p>
                    </div>

                    <div className="mt-12 flex flex-wrap justify-center gap-3">
                      {currentVerse.keyThemes.map((t, idx) => (
                        <span key={idx} className="bg-slate-900/80 text-amber-500/80 px-5 py-2 rounded-full text-xs border border-white/5 font-bold uppercase tracking-widest">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="glass p-10 rounded-[2.5rem] space-y-4 border-l-4 border-l-amber-500 shadow-xl">
                      <h4 className="text-xl font-black text-amber-500 bn-serif flex items-center gap-3">
                        <i className="fa-solid fa-wand-magic-sparkles"></i> মূল ভাবার্থ
                      </h4>
                      <p className="text-slate-300 text-lg leading-relaxed bn-serif italic">{currentVerse.explanation.theologicalMeaning}</p>
                   </div>
                   <div className="glass p-10 rounded-[2.5rem] space-y-4 border-l-4 border-l-slate-600 shadow-xl">
                      <h4 className="text-xl font-black text-slate-400 bn-serif flex items-center gap-3">
                        <i className="fa-solid fa-clock-rotate-left"></i> পটভূমি
                      </h4>
                      <p className="text-slate-400 text-lg leading-relaxed bn-serif">{currentVerse.explanation.historicalContext}</p>
                   </div>
                </div>

                <div className="glass p-12 rounded-[3rem] relative overflow-hidden group shadow-2xl border border-amber-500/10">
                   <div className="absolute top-0 right-0 p-12 text-amber-500/5 text-9xl pointer-events-none">
                     <i className="fa-solid fa-lightbulb"></i>
                   </div>
                   <h4 className="text-2xl font-black text-amber-500 mb-6 bn-serif">অনুপ্রেরণা ও প্রয়োগ</h4>
                   <p className="text-slate-200 text-xl leading-relaxed bn-serif italic relative z-10">
                     {currentVerse.explanation.practicalApplication}
                   </p>
                </div>
              </div>
            )}

            {/* Initial Suggestions */}
            {!currentVerse && state === AppState.IDLE && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
                <SuggestCard title="আমি বাংলায় গান গাই" type="Lyrics" onClick={() => handleSearch('আমি বাংলায় গান গাই')} />
                <SuggestCard title="যোহন ৩:১৬" type="Verse" onClick={() => handleSearch('যোহন ৩:১৬')} />
                <SuggestCard title="ধনধান্য পুষ্প ভরা" type="Lyrics" onClick={() => handleSearch('ধনধান্য পুষ্প ভরা')} />
                <SuggestCard title="গীতসংহিতা ২৩" type="Psalm" onClick={() => handleSearch('গীতসংহিতা ২৩')} />
              </div>
            )}
          </div>
        )}

        {/* Saved View */}
        {activeView === 'SAVED' && (
          <div className="animate-in fade-in slide-in-from-right-10 duration-500 space-y-8">
            <h2 className="text-3xl font-black text-white flex items-center gap-4 px-2">
              <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
              সংরক্ষিত লিরিক্স
            </h2>
            {savedVerses.length === 0 ? (
              <div className="glass p-20 text-center rounded-[3rem] border-dashed border-white/5 opacity-50 mt-10">
                <i className="fa-solid fa-box-open text-6xl mb-6 text-slate-700"></i>
                <p className="text-slate-400 font-bold italic">এখনো কিছুই সংরক্ষণ করা হয়নি</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-8 px-8 py-3 bg-amber-600/20 text-amber-500 rounded-full font-bold hover:bg-amber-600/30 transition-all">সার্চ করুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedVerses.map(v => (
                  <div key={v.id} className="glass p-8 rounded-[2.5rem] group hover:border-amber-500/30 transition-all cursor-pointer relative shadow-lg" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xl font-bold text-amber-500 bn-serif">{v.reference}</h3>
                       <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-600 hover:text-rose-500 transition-colors p-2">
                         <i className="fa-solid fa-trash-can"></i>
                       </button>
                    </div>
                    <p className="text-slate-400 line-clamp-2 italic bn-serif">"{v.text}"</p>
                    <div className="mt-4 flex gap-2 overflow-hidden">
                       {v.keyThemes.slice(0, 2).map((t, idx) => (
                         <span key={idx} className="text-[9px] bg-white/5 px-2 py-1 rounded text-slate-500 uppercase tracking-widest">#{t}</span>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings View */}
        {activeView === 'SETTINGS' && (
          <div className="glass p-12 rounded-[3rem] max-w-2xl mx-auto space-y-10 animate-in fade-in zoom-in-95 duration-500 shadow-2xl">
            <h2 className="text-3xl font-black text-amber-400 flex items-center gap-4">
               <i className="fa-solid fa-sliders"></i> সেটিংস
            </h2>
            <div className="space-y-6">
                <label className="block text-slate-400 text-sm font-black uppercase tracking-[0.2em]">পাঠের কণ্ঠস্বর নির্বাচন করুন</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Kore', 'Zephyr', 'Charon', 'Puck'].map((v) => (
                    <button 
                      key={v} 
                      onClick={() => setSelectedVoice(v)} 
                      className={`p-6 rounded-[2rem] border-2 transition-all text-left font-black ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                    >
                      <i className="fa-solid fa-user-voice mr-3 opacity-50"></i>
                      {v}
                    </button>
                  ))}
                </div>
            </div>
            <div className="pt-6 border-t border-white/5 text-center">
               <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Lyrical Reading AI v1.2</p>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Mobile Bottom Nav */}
      <nav className="fixed bottom-6 left-6 right-6 glass md:hidden flex justify-around p-4 rounded-[2.5rem] z-50 shadow-2xl border-white/10">
        <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
        <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
        <NavItem icon="fa-gear" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
      </nav>
    </div>
  );
}

const SuggestCard: React.FC<{ title: string; type: string; onClick: () => void }> = ({ title, type, onClick }) => (
  <button onClick={onClick} className="glass p-6 rounded-[2.5rem] text-left hover:bg-amber-600/5 hover:border-amber-500/20 transition-all group flex items-center justify-between border border-transparent shadow-lg">
    <div className="space-y-1">
      <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest opacity-50">{type}</p>
      <h4 className="text-lg font-bold text-slate-300 group-hover:text-white transition-colors bn-serif">{title}</h4>
    </div>
    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center transition-all group-hover:bg-amber-500/20 group-hover:translate-x-1">
      <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-amber-500 text-xs"></i>
    </div>
  </button>
);
