
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
    const stored = localStorage.getItem('sacred_word_verses');
    if (stored) {
      try { setSavedVerses(JSON.parse(stored)); } catch (e) { setSavedVerses([]); }
    }
  }, []);

  const saveToLocal = (verses: VerseData[]) => {
    localStorage.setItem('sacred_word_verses', JSON.stringify(verses));
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
      setCurrentVerse(data);
      setState(AppState.IDLE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'সংযোগ বিচ্ছিন্ন হয়েছে। পুনরায় চেষ্টা করুন।');
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
      console.error("Audio error:", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pb-24 md:pb-0 bg-[#020617]">
      <header className="w-full max-w-5xl px-6 pt-12 pb-8 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/20 transform -rotate-3 hover:rotate-0 transition-transform">
            <i className="fa-solid fa-cross text-white text-3xl"></i>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight leading-none bn-serif">
              পবিত্র <span className="text-gold">বানী</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1.5">Divine Insight AI</p>
          </div>
        </div>
        <div className="hidden md:flex glass px-5 py-2.5 rounded-2xl gap-3">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <NavItem icon="fa-bookmark" label="সংরক্ষিত" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <NavItem icon="fa-sliders" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </header>

      <main className="w-full max-w-5xl p-6">
        {activeView === 'SEARCH' && (
          <div className="space-y-16 animate-in fade-in duration-700">
            {/* Elegant Search Box */}
            <div className="max-w-3xl mx-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 rounded-full blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-700"></div>
                <div className="relative">
                  <div className="absolute left-7 top-1/2 -translate-y-1/2 text-amber-500/40">
                    <i className="fa-solid fa-feather text-xl"></i>
                  </div>
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="গানের লিরিক্স বা পবিত্র বাণী লিখুন..."
                    className="w-full bg-[#0f172a]/90 backdrop-blur-3xl border border-white/10 pl-16 pr-40 py-7 rounded-full text-xl outline-none focus:ring-2 ring-amber-500/40 transition-all placeholder-slate-600 text-white font-medium shadow-2xl"
                  />
                  <button 
                    type="submit"
                    disabled={state === AppState.SEARCHING}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-600 hover:bg-amber-500 text-white font-black px-10 py-4.5 rounded-full shadow-lg transition-all flex items-center gap-3 disabled:opacity-40 active:scale-95"
                  >
                    {state === AppState.SEARCHING ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-sparkles"></i>}
                    <span className="hidden sm:inline">খুঁজুন</span>
                  </button>
                </div>
              </form>
            </div>

            {/* States Handling */}
            {state === AppState.SEARCHING && (
              <div className="flex flex-col items-center py-32 gap-10">
                <div className="relative w-32 h-32">
                  <div className="absolute inset-0 border-4 border-amber-500/5 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-cross text-amber-500 text-3xl animate-pulse"></i>
                  </div>
                </div>
                <div className="text-center space-y-4">
                  <h3 className="text-white font-bold text-3xl bn-serif">গভীর অর্থ বিশ্লেষণ করা হচ্ছে...</h3>
                  <p className="text-slate-500 text-xs tracking-[0.3em] uppercase font-black opacity-60">Interpretation by Pabitra Bani AI</p>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="glass p-16 text-center rounded-[4rem] border-rose-500/20 max-w-2xl mx-auto shadow-2xl">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-10">
                  <i className="fa-solid fa-ban text-rose-500 text-5xl"></i>
                </div>
                <h3 className="text-white text-2xl font-black mb-5">সঠিক তথ্য পাওয়া যায়নি</h3>
                <p className="text-slate-400 mb-12 text-lg leading-relaxed">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className="px-12 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl text-white font-black transition-all">আবার চেষ্টা করুন</button>
              </div>
            )}

            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-14 animate-in slide-in-from-bottom-12 duration-1000">
                {/* Result Card */}
                <div className="relative">
                  <div className="absolute -inset-10 bg-amber-500/5 rounded-[5rem] blur-[80px] pointer-events-none"></div>
                  <div className="relative bg-[#0f172a]/70 backdrop-blur-3xl p-14 md:p-24 rounded-[4rem] border border-white/5 text-center shadow-3xl overflow-hidden">
                    <div className="absolute top-12 right-12 flex gap-5">
                      <button onClick={toggleSave} className={`w-14 h-14 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400' : 'text-slate-500'}`}>
                        <i className="fa-solid fa-bookmark text-xl"></i>
                      </button>
                      <button onClick={handleRead} className={`w-14 h-14 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all ${isReading ? 'text-rose-500' : 'text-amber-500'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-circle-stop' : 'fa-circle-play text-2xl'}`}></i>
                      </button>
                    </div>

                    <p className="text-amber-500/40 uppercase tracking-[0.5em] font-black text-[10px] mb-14">Sacred Script Excerpt</p>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-16 leading-[1.6] bn-serif italic px-6 drop-shadow-2xl">
                      "{currentVerse.text}"
                    </h2>
                    <div className="inline-block px-12 py-4 bg-amber-600/10 rounded-3xl border border-amber-500/20">
                      <p className="text-amber-500 font-black tracking-widest text-2xl">— {currentVerse.reference} —</p>
                    </div>

                    <div className="mt-16 flex flex-wrap justify-center gap-4">
                      {currentVerse.keyThemes.map((t, idx) => (
                        <span key={idx} className="bg-slate-900/60 text-amber-500/60 px-7 py-3 rounded-full text-[12px] border border-white/5 font-black uppercase tracking-widest">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis Detail */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="bg-[#0f172a]/50 p-12 rounded-[3.5rem] space-y-6 border border-white/5 shadow-2xl">
                      <h4 className="text-2xl font-black text-amber-500 bn-serif flex items-center gap-4">
                        <i className="fa-solid fa-feather-pointed"></i> মূল ভাবার্থ
                      </h4>
                      <p className="text-slate-300 text-xl leading-relaxed bn-serif italic">{currentVerse.explanation.theologicalMeaning}</p>
                   </div>
                   <div className="bg-[#0f172a]/50 p-12 rounded-[3.5rem] space-y-6 border border-white/5 shadow-2xl">
                      <h4 className="text-2xl font-black text-slate-500 bn-serif flex items-center gap-4">
                        <i className="fa-solid fa-history"></i> প্রেক্ষাপট
                      </h4>
                      <p className="text-slate-400 text-xl leading-relaxed bn-serif">{currentVerse.explanation.historicalContext}</p>
                   </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f172a] to-[#020617] p-16 rounded-[5rem] relative overflow-hidden group border border-amber-500/10 shadow-3xl">
                   <div className="absolute top-0 right-0 p-16 text-amber-500/5 text-[18rem] pointer-events-none transform rotate-12">
                     <i className="fa-solid fa-quote-right"></i>
                   </div>
                   <h4 className="text-3xl font-black text-amber-600 mb-10 bn-serif">অনুপ্রেরণা ও প্রয়োগ</h4>
                   <p className="text-slate-100 text-2xl leading-[1.8] bn-serif italic relative z-10 font-medium">
                     {currentVerse.explanation.practicalApplication}
                   </p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            {!currentVerse && state === AppState.IDLE && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto pb-20">
                <SuggestCard title="আমি বাংলায় গান গাই" type="Classic Lyric" onClick={() => handleSearch('আমি বাংলায় গান গাই')} />
                <SuggestCard title="যোহন ৩:১৬" type="Bible Scripture" onClick={() => handleSearch('যোহন ৩:১৬')} />
                <SuggestCard title="ধনধান্য পুষ্প ভরা" type="Soulful Melody" onClick={() => handleSearch('ধনধান্য পুষ্প ভরা')} />
                <SuggestCard title="গীতসংহিতা ২৩" type="Sacred Psalm" onClick={() => handleSearch('গীতসংহিতা ২৩')} />
              </div>
            )}
          </div>
        )}

        {/* Saved Items */}
        {activeView === 'SAVED' && (
          <div className="animate-in fade-in slide-in-from-right-12 duration-600 space-y-12">
            <h2 className="text-5xl font-black text-white flex items-center gap-6 px-4">
              <div className="w-3 h-12 bg-amber-500 rounded-full"></div>
              সংরক্ষিত বাণী
            </h2>
            {savedVerses.length === 0 ? (
              <div className="glass p-32 text-center rounded-[5rem] opacity-30 mt-10">
                <i className="fa-solid fa-heart-crack text-8xl mb-10"></i>
                <p className="text-slate-500 font-bold italic text-2xl tracking-wide">আপনার সংগ্রহশালাটি বর্তমানে শূন্য</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-12 px-12 py-5 bg-amber-600/10 text-amber-500 rounded-2xl font-black hover:bg-amber-600/20 transition-all">সার্চ করতে ফিরে যান</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {savedVerses.map(v => (
                  <div key={v.id} className="bg-[#0f172a]/50 p-12 rounded-[4rem] group hover:border-amber-500/30 transition-all cursor-pointer relative shadow-3xl border border-white/5" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="flex justify-between items-start mb-8">
                       <h3 className="text-2xl font-black text-amber-500 bn-serif">{v.reference}</h3>
                       <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-700 hover:text-rose-500 transition-colors p-4 bg-white/5 rounded-2xl">
                         <i className="fa-solid fa-trash text-sm"></i>
                       </button>
                    </div>
                    <p className="text-slate-400 line-clamp-3 italic bn-serif text-xl leading-relaxed">"{v.text}"</p>
                    <div className="mt-10 flex gap-4">
                       {v.keyThemes.slice(0, 2).map((t, idx) => (
                         <span key={idx} className="text-[11px] bg-amber-500/5 px-4 py-2 rounded-xl text-amber-600 font-black uppercase tracking-widest border border-amber-500/10">#{t}</span>
                       ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {activeView === 'SETTINGS' && (
          <div className="bg-[#0f172a]/60 backdrop-blur-3xl p-16 rounded-[5rem] max-w-2xl mx-auto space-y-14 animate-in zoom-in-95 shadow-3xl border border-white/10">
            <h2 className="text-4xl font-black text-amber-400 flex items-center gap-6">
               <i className="fa-solid fa-gear"></i> সেটিংস
            </h2>
            <div className="space-y-10">
                <label className="block text-slate-500 text-[12px] font-black uppercase tracking-[0.5em] ml-2">আবৃত্তি কণ্ঠস্বর (Voice)</label>
                <div className="grid grid-cols-2 gap-6">
                  {['Kore', 'Zephyr', 'Charon', 'Puck'].map((v) => (
                    <button 
                      key={v} 
                      onClick={() => setSelectedVoice(v)} 
                      className={`p-10 rounded-[3rem] border-2 transition-all text-left font-black ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-2xl shadow-amber-500/20' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                    >
                      <i className="fa-solid fa-microphone-lines mr-4 opacity-30"></i>
                      {v}
                    </button>
                  ))}
                </div>
            </div>
            <div className="pt-12 border-t border-white/5 text-center">
               <p className="text-slate-600 text-[11px] uppercase tracking-[0.4em] font-black">পবিত্র বানী (Sacred Word) — v2.0</p>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-10 left-10 right-10 bg-[#0f172a]/70 backdrop-blur-3xl md:hidden flex justify-around p-6 rounded-[3rem] z-50 shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10">
        <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
        <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
        <NavItem icon="fa-sliders" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
      </nav>
    </div>
  );
}

const SuggestCard: React.FC<{ title: string; type: string; onClick: () => void }> = ({ title, type, onClick }) => (
  <button onClick={onClick} className="bg-[#0f172a]/50 backdrop-blur-3xl p-10 rounded-[4rem] text-left hover:bg-amber-600/10 hover:border-amber-500/30 transition-all group flex items-center justify-between border border-white/5 shadow-2xl">
    <div className="space-y-3">
      <p className="text-[11px] text-amber-500 font-black uppercase tracking-[0.4em] opacity-50">{type}</p>
      <h4 className="text-2xl font-bold text-slate-200 group-hover:text-white transition-colors bn-serif">{title}</h4>
    </div>
    <div className="w-14 h-14 rounded-3xl bg-white/5 flex items-center justify-center transition-all group-hover:bg-amber-500/20 group-hover:translate-x-2">
      <i className="fa-solid fa-arrow-right text-slate-700 group-hover:text-amber-500 text-sm"></i>
    </div>
  </button>
);
