
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { VerseData, AppState, View } from './types';

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all px-4 py-2 rounded-xl ${active ? 'text-amber-400 scale-105' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <i className={`fa-solid ${icon} text-lg ${active ? 'animate-pulse' : ''}`}></i>
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
      setError(err.message || 'সার্ভার সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
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
      console.error("Audio playback error:", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pb-24 md:pb-0 bg-[#020617]">
      <header className="w-full max-w-5xl px-6 pt-12 pb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
            <i className="fa-solid fa-music text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none">
              লিরিক্স বাণী <span className="text-amber-500">AI</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Divine Lyrical Reader</p>
          </div>
        </div>
        <div className="hidden md:flex glass px-5 py-2.5 rounded-2xl gap-3">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <NavItem icon="fa-bookmark" label="সংরক্ষিত" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <NavItem icon="fa-gear" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </header>

      <main className="w-full max-w-5xl p-6">
        {activeView === 'SEARCH' && (
          <div className="space-y-14 animate-in fade-in duration-700">
            {/* Elegant Search Area */}
            <div className="max-w-3xl mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500/30 to-rose-500/30 rounded-full blur-lg opacity-0 group-focus-within:opacity-100 transition-all duration-500"></div>
                <div className="relative">
                  <div className="absolute left-7 top-1/2 -translate-y-1/2 text-amber-500/40">
                    <i className="fa-solid fa-feather-pointed text-xl"></i>
                  </div>
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="গানের নাম বা লিরিক্স লিখে খুঁজুন..."
                    className="w-full bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 pl-16 pr-36 py-7 rounded-full text-xl outline-none focus:ring-2 ring-amber-500/30 transition-all placeholder-slate-600 text-white font-medium shadow-2xl"
                  />
                  <button 
                    type="submit"
                    disabled={state === AppState.SEARCHING}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-amber-600 hover:bg-amber-500 text-white font-black px-9 py-4 rounded-full shadow-lg transition-all flex items-center gap-2 disabled:opacity-40 active:scale-95"
                  >
                    {state === AppState.SEARCHING ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-wand-magic-sparkles"></i>}
                    <span className="hidden sm:inline">ব্যাখ্যা করুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Content States */}
            {state === AppState.SEARCHING && (
              <div className="flex flex-col items-center py-28 gap-10">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 border-4 border-amber-500/5 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-om text-amber-500 text-3xl animate-pulse"></i>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h3 className="text-white font-bold text-3xl bn-serif tracking-wide">গভীর অন্তর্দৃষ্টি খোঁজা হচ্ছে...</h3>
                  <p className="text-slate-500 text-sm tracking-[0.2em] uppercase font-black opacity-60">AI is analyzing the soul of words</p>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="glass p-14 text-center rounded-[3.5rem] border-rose-500/20 max-w-2xl mx-auto shadow-2xl animate-in zoom-in-95">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <i className="fa-solid fa-triangle-exclamation text-rose-500 text-5xl"></i>
                </div>
                <h3 className="text-white text-2xl font-black mb-4">তথ্য পাওয়া যায়নি</h3>
                <p className="text-slate-400 mb-10 text-lg leading-relaxed">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className="px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-black transition-all active:scale-95">পুনরায় চেষ্টা করুন</button>
              </div>
            )}

            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-1000">
                {/* Main Lyric Card */}
                <div className="relative">
                  <div className="absolute -inset-10 bg-amber-500/5 rounded-[4rem] blur-[60px] pointer-events-none"></div>
                  <div className="relative bg-[#0f172a]/60 backdrop-blur-3xl p-12 md:p-20 rounded-[4rem] border border-white/5 text-center shadow-3xl overflow-hidden">
                    <div className="absolute top-10 right-10 flex gap-4">
                      <button onClick={toggleSave} className={`w-14 h-14 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.2)]' : 'text-slate-500'}`}>
                        <i className="fa-solid fa-bookmark text-xl"></i>
                      </button>
                      <button onClick={handleRead} className={`w-14 h-14 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all ${isReading ? 'text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]' : 'text-amber-500'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-circle-stop' : 'fa-circle-play text-2xl'}`}></i>
                      </button>
                    </div>

                    <p className="text-amber-500/40 uppercase tracking-[0.5em] font-black text-[10px] mb-12">Original Lyrical Excerpt</p>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-14 leading-[1.5] bn-serif italic px-6 drop-shadow-lg">
                      "{currentVerse.text}"
                    </h2>
                    <div className="inline-block px-10 py-4 bg-amber-600/10 rounded-2xl border border-amber-500/20 shadow-inner">
                      <p className="text-amber-500 font-black tracking-[0.1em] text-xl">— {currentVerse.reference} —</p>
                    </div>

                    <div className="mt-14 flex flex-wrap justify-center gap-3">
                      {currentVerse.keyThemes.map((t, idx) => (
                        <span key={idx} className="bg-slate-900/60 text-amber-500/60 px-6 py-2.5 rounded-full text-[11px] border border-white/5 font-black uppercase tracking-widest hover:bg-amber-500/10 hover:text-amber-500 transition-colors cursor-default">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-[#0f172a]/40 backdrop-blur-xl p-10 rounded-[3rem] space-y-5 border-t border-white/5 shadow-xl hover:translate-y-[-4px] transition-transform">
                      <h4 className="text-2xl font-black text-amber-500 bn-serif flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center"><i className="fa-solid fa-sparkles text-sm"></i></div>
                        গভীর ভাবার্থ
                      </h4>
                      <p className="text-slate-300 text-lg leading-relaxed bn-serif italic opacity-90">{currentVerse.explanation.theologicalMeaning}</p>
                   </div>
                   <div className="bg-[#0f172a]/40 backdrop-blur-xl p-10 rounded-[3rem] space-y-5 border-t border-white/5 shadow-xl hover:translate-y-[-4px] transition-transform">
                      <h4 className="text-2xl font-black text-slate-400 bn-serif flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center"><i className="fa-solid fa-clock-rotate-left text-sm"></i></div>
                        ঐতিহাসিক প্রেক্ষাপট
                      </h4>
                      <p className="text-slate-400 text-lg leading-relaxed bn-serif opacity-80">{currentVerse.explanation.historicalContext}</p>
                   </div>
                </div>

                {/* Reflection Card */}
                <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-14 rounded-[4rem] relative overflow-hidden group shadow-2xl border border-white/5">
                   <div className="absolute -top-10 -right-10 p-20 text-amber-500/5 text-[15rem] pointer-events-none transform rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                     <i className="fa-solid fa-quote-right"></i>
                   </div>
                   <h4 className="text-3xl font-black text-amber-600 mb-8 bn-serif flex items-center gap-3">
                     প্রতিচ্ছবি ও প্রয়োগ
                   </h4>
                   <p className="text-slate-200 text-2xl leading-[1.8] bn-serif italic relative z-10 font-medium">
                     {currentVerse.explanation.practicalApplication}
                   </p>
                </div>
              </div>
            )}

            {/* Suggestions */}
            {!currentVerse && state === AppState.IDLE && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto pb-10">
                <SuggestCard title="আমি বাংলায় গান গাই" type="Lyrics" onClick={() => handleSearch('আমি বাংলায় গান গাই')} />
                <SuggestCard title="যোহন ৩:১৬" type="Bible Verse" onClick={() => handleSearch('যোহন ৩:১৬')} />
                <SuggestCard title="ধনধান্য পুষ্প ভরা" type="Lyrics" onClick={() => handleSearch('ধনধান্য পুষ্প ভরা')} />
                <SuggestCard title="গীতসংহিতা ২৩" type="Psalm" onClick={() => handleSearch('গীতসংহিতা ২৩')} />
              </div>
            )}
          </div>
        )}

        {/* Saved View */}
        {activeView === 'SAVED' && (
          <div className="animate-in fade-in slide-in-from-right-10 duration-500 space-y-10">
            <h2 className="text-4xl font-black text-white flex items-center gap-5 px-4">
              <div className="w-2.5 h-10 bg-amber-500 rounded-full"></div>
              সংরক্ষিত লিরিক্স
            </h2>
            {savedVerses.length === 0 ? (
              <div className="glass p-24 text-center rounded-[4rem] border-dashed border-white/5 opacity-40 mt-10">
                <i className="fa-solid fa-box-archive text-7xl mb-8 text-slate-800"></i>
                <p className="text-slate-500 font-bold italic text-xl">আপনার সংগ্রহশালা বর্তমানে খালি।</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-10 px-10 py-4 bg-amber-600/10 text-amber-500 rounded-2xl font-black hover:bg-amber-600/20 transition-all active:scale-95">সার্চ করতে যান</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {savedVerses.map(v => (
                  <div key={v.id} className="bg-[#0f172a]/40 backdrop-blur-xl p-10 rounded-[3rem] group hover:border-amber-500/40 transition-all cursor-pointer relative shadow-2xl border border-white/5" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="flex justify-between items-start mb-6">
                       <h3 className="text-2xl font-black text-amber-500 bn-serif">{v.reference}</h3>
                       <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-700 hover:text-rose-500 transition-colors p-3 bg-white/5 rounded-xl">
                         <i className="fa-solid fa-trash-can text-sm"></i>
                       </button>
                    </div>
                    <p className="text-slate-400 line-clamp-2 italic bn-serif text-lg leading-relaxed">"{v.text}"</p>
                    <div className="mt-8 flex gap-3">
                       {v.keyThemes.slice(0, 2).map((t, idx) => (
                         <span key={idx} className="text-[10px] bg-amber-500/5 px-3 py-1.5 rounded-lg text-amber-600 font-black uppercase tracking-widest border border-amber-500/10">#{t}</span>
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
          <div className="bg-[#0f172a]/40 backdrop-blur-3xl p-14 rounded-[4rem] max-w-2xl mx-auto space-y-12 animate-in zoom-in-95 shadow-3xl border border-white/5">
            <h2 className="text-4xl font-black text-amber-400 flex items-center gap-5">
               <i className="fa-solid fa-sliders"></i> সেটিংস
            </h2>
            <div className="space-y-8">
                <label className="block text-slate-500 text-[11px] font-black uppercase tracking-[0.4em] ml-1">কণ্ঠস্বর নির্বাচন করুন (TTS Voice)</label>
                <div className="grid grid-cols-2 gap-5">
                  {['Kore', 'Zephyr', 'Charon', 'Puck'].map((v) => (
                    <button 
                      key={v} 
                      onClick={() => setSelectedVoice(v)} 
                      className={`p-8 rounded-[2.5rem] border-2 transition-all text-left font-black ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.1)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                    >
                      <i className="fa-solid fa-user-tie mr-4 opacity-40"></i>
                      {v}
                    </button>
                  ))}
                </div>
            </div>
            <div className="pt-10 border-t border-white/5 text-center">
               <p className="text-slate-600 text-[10px] uppercase tracking-[0.3em] font-black">Divine Lyrics AI — v1.5 Premium</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="fixed bottom-8 left-8 right-8 bg-[#0f172a]/60 backdrop-blur-2xl md:hidden flex justify-around p-5 rounded-[2.5rem] z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10">
        <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
        <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
        <NavItem icon="fa-gear" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
      </nav>
    </div>
  );
}

const SuggestCard: React.FC<{ title: string; type: string; onClick: () => void }> = ({ title, type, onClick }) => (
  <button onClick={onClick} className="bg-[#0f172a]/40 backdrop-blur-xl p-8 rounded-[2.5rem] text-left hover:bg-amber-600/5 hover:border-amber-500/20 transition-all group flex items-center justify-between border border-transparent shadow-xl">
    <div className="space-y-2">
      <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.3em] opacity-50">{type}</p>
      <h4 className="text-xl font-bold text-slate-300 group-hover:text-white transition-colors bn-serif tracking-wide">{title}</h4>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center transition-all group-hover:bg-amber-500/10 group-hover:translate-x-1 shadow-inner">
      <i className="fa-solid fa-chevron-right text-slate-700 group-hover:text-amber-500 text-sm"></i>
    </div>
  </button>
);
