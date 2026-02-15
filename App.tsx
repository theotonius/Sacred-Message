
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { VerseData, AppState, View } from './types';

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 transition-all px-6 py-3 rounded-2xl group ${active ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
  >
    <i className={`fa-solid ${icon} text-lg group-hover:scale-110 transition-transform`}></i>
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
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
    <div className="min-h-screen flex flex-col bg-[#030712] relative">
      {/* Divine Background Element */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

      <header className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-float">
            <i className="fa-solid fa-cross text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white leading-none bn-serif tracking-tight">
              পবিত্র <span className="text-divine-gold">বানী</span>
            </h1>
            <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.4em] mt-2">Heavenly Interpretation AI</p>
          </div>
        </div>
        
        <div className="hidden md:flex divine-glass px-2 py-2 rounded-3xl gap-1">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <NavItem icon="fa-sliders" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 relative z-10">
        {activeView === 'SEARCH' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Professional Search Area */}
            <div className="max-w-4xl mx-auto mt-12">
              <div className="text-center mb-12">
                <h2 className="text-white text-xl font-medium tracking-widest uppercase mb-4 opacity-40">Seek Divine Wisdom</h2>
                <div className="h-0.5 w-16 bg-amber-500 mx-auto rounded-full"></div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-amber-200/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
                <div className="relative">
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="পবিত্র বাণী বা সংগীতের চরণ লিখুন..."
                    className="w-full bg-slate-900/60 backdrop-blur-3xl border border-white/10 pl-10 pr-48 py-8 rounded-[2.5rem] text-2xl outline-none focus:ring-1 ring-amber-500/50 transition-all placeholder-slate-600 text-white font-medium shadow-3xl bn-serif"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                     <button 
                        type="submit"
                        disabled={state === AppState.SEARCHING}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-10 py-5 rounded-full shadow-lg transition-all flex items-center gap-3 disabled:opacity-40 active:scale-95 group/btn overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
                        {state === AppState.SEARCHING ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-wand-sparkles"></i>}
                        <span className="relative z-10">বিশ্লেষণ</span>
                      </button>
                  </div>
                </div>
              </form>
            </div>

            {state === AppState.SEARCHING && (
              <div className="flex flex-col items-center py-20 gap-8 animate-pulse">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                  <i className="fa-solid fa-cross text-amber-500 text-2xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
                </div>
                <div className="text-center">
                  <h3 className="text-white text-2xl font-bold bn-serif mb-2">ঐশ্বরিক অন্তর্দৃষ্টি খোঁজা হচ্ছে</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-[0.5em] font-black">Sacred Word AI is thinking...</p>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="max-w-2xl mx-auto divine-glass p-12 rounded-[3rem] text-center border-rose-500/20">
                <i className="fa-solid fa-circle-exclamation text-rose-500 text-5xl mb-6"></i>
                <h3 className="text-white text-2xl font-black mb-4">তথ্য বিভ্রাট</h3>
                <p className="text-slate-400 text-lg mb-10">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white font-black border border-white/5 transition-all">আবার চেষ্টা করুন</button>
              </div>
            )}

            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in slide-in-from-bottom-12 duration-1000">
                {/* Main Quote Card */}
                <div className="relative group">
                  <div className="absolute -inset-4 bg-amber-500/5 rounded-[4rem] blur-2xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
                  <div className="relative bg-slate-900/40 backdrop-blur-3xl p-16 md:p-24 rounded-[4rem] border border-white/5 overflow-hidden text-center shadow-2xl">
                    <div className="absolute top-10 right-10 flex gap-4">
                      <button onClick={toggleSave} className={`w-14 h-14 flex items-center justify-center rounded-2xl divine-glass transition-all ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                        <i className={`fa-solid ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
                      </button>
                      <button onClick={handleRead} className={`w-14 h-14 flex items-center justify-center rounded-2xl divine-glass transition-all ${isReading ? 'text-rose-500' : 'text-amber-500 hover:text-amber-400'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-square' : 'fa-play'}`}></i>
                      </button>
                    </div>

                    <div className="mb-12">
                      <i className="fa-solid fa-quote-left text-amber-500/20 text-6xl mb-6"></i>
                      <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.4] bn-serif italic px-4 drop-shadow-xl">
                        {currentVerse.text}
                      </h2>
                    </div>
                    
                    <div className="inline-flex items-center gap-6 px-10 py-4 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-inner">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-amber-500 font-black tracking-[0.2em] text-xl bn-serif">{currentVerse.reference}</p>
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Professional Analysis Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner">
                      <i className="fa-solid fa-lightbulb"></i>
                    </div>
                    <h4 className="text-xl font-black text-amber-400 bn-serif flex items-center gap-3">
                      ভাবার্থ ও মর্ম
                    </h4>
                    <p className="text-slate-300 text-lg leading-relaxed bn-serif italic font-light">
                      {currentVerse.explanation.theologicalMeaning}
                    </p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 text-2xl shadow-inner">
                      <i className="fa-solid fa-scroll"></i>
                    </div>
                    <h4 className="text-xl font-black text-blue-400 bn-serif flex items-center gap-3">
                      প্রেক্ষাপট ও ইতিহাস
                    </h4>
                    <p className="text-slate-400 text-lg leading-relaxed bn-serif font-light">
                      {currentVerse.explanation.historicalContext}
                    </p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner">
                      <i className="fa-solid fa-seedling"></i>
                    </div>
                    <h4 className="text-xl font-black text-emerald-400 bn-serif flex items-center gap-3">
                      জীবনচর্চায় প্রয়োগ
                    </h4>
                    <p className="text-slate-300 text-lg leading-relaxed bn-serif italic font-light">
                      {currentVerse.explanation.practicalApplication}
                    </p>
                  </div>
                </div>

                {/* Key Themes Footer */}
                <div className="flex flex-wrap justify-center gap-4 pt-10">
                   {currentVerse.keyThemes.map((theme, i) => (
                     <span key={i} className="px-6 py-2.5 rounded-full divine-glass text-[10px] font-black text-amber-500/60 uppercase tracking-widest border border-amber-500/10 hover:border-amber-500/40 transition-all cursor-default">
                       {theme}
                     </span>
                   ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {!currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-6">Suggested Passages</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RecommendItem 
                    title="আমি বাংলায় গান গাই" 
                    desc="Cultural Spiritualism" 
                    icon="fa-music"
                    onClick={() => handleSearch('আমি বাংলায় গান গাই')} 
                  />
                  <RecommendItem 
                    title="যোহন ৩:১৬" 
                    desc="Biblical Foundation" 
                    icon="fa-book-bible"
                    onClick={() => handleSearch('যোহন ৩:১৬')} 
                  />
                  <RecommendItem 
                    title="সুরা আল-ফাতিহা" 
                    desc="Divine Guidance" 
                    icon="fa-mosque"
                    onClick={() => handleSearch('সুরা আল-ফাতিহা')} 
                  />
                  <RecommendItem 
                    title="ধনধান্য পুষ্প ভরা" 
                    desc="Patriotic Devotion" 
                    icon="fa-flag"
                    onClick={() => handleSearch('ধনধান্য পুষ্প ভরা')} 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved View */}
        {activeView === 'SAVED' && (
          <div className="animate-in fade-in slide-in-from-right-12 duration-600 space-y-12 py-10">
            <div className="flex items-end gap-6 mb-16">
               <h2 className="text-6xl font-black text-white bn-serif leading-none">আপনার <span className="text-divine-gold">সংগ্রহ</span></h2>
               <div className="h-1 flex-1 bg-white/5 rounded-full mb-3"></div>
            </div>

            {savedVerses.length === 0 ? (
              <div className="divine-glass p-32 text-center rounded-[5rem] opacity-40">
                <i className="fa-solid fa-folder-open text-7xl mb-8"></i>
                <p className="text-2xl bn-serif italic">বর্তমানে কোনো সংরক্ষিত বাণী নেই</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-10 px-12 py-5 bg-amber-500 text-black font-black rounded-2xl hover:scale-105 transition-all">বাণী খুঁজুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedVerses.map(v => (
                  <div key={v.id} className="divine-card p-10 rounded-[3rem] group cursor-pointer" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-amber-500 font-black text-sm bn-serif">{v.reference}</span>
                      <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-700 hover:text-rose-500 transition-colors p-2">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <p className="text-slate-200 bn-serif text-lg italic line-clamp-3 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">"{v.text}"</p>
                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
                       <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(v.timestamp).toLocaleDateString('bn-BD')}</span>
                       <i className="fa-solid fa-arrow-right-long text-amber-500/40 group-hover:text-amber-500 transition-all group-hover:translate-x-2"></i>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings View */}
        {activeView === 'SETTINGS' && (
          <div className="max-w-3xl mx-auto py-12 space-y-12 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-slate-400">
                 <i className="fa-solid fa-sliders text-2xl"></i>
               </div>
               <h2 className="text-4xl font-black text-white">অ্যাপ সেটিংস</h2>
             </div>

             <div className="divine-glass p-12 rounded-[4rem] space-y-12">
                <div className="space-y-6">
                   <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] ml-2">Voice Synthesis</h4>
                   <div className="grid grid-cols-2 gap-4">
                      {['Kore', 'Zephyr', 'Charon', 'Puck'].map(v => (
                        <button 
                          key={v}
                          onClick={() => setSelectedVoice(v)}
                          className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.1)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                        >
                          <i className="fa-solid fa-microphone-lines text-2xl opacity-40"></i>
                          <span className="font-black tracking-widest text-sm uppercase">{v} Voice</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-10 border-t border-white/5 flex justify-between items-center opacity-40">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">Version 2.5 Divine Edition</p>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">© পবিত্র বানী AI</p>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Modern Mobile Navigation */}
      <nav className="fixed bottom-8 left-6 right-6 md:hidden z-50">
        <div className="divine-glass flex justify-around p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10">
          <MobileNavItem icon="fa-magnifying-glass" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <MobileNavItem icon="fa-bookmark" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <MobileNavItem icon="fa-sliders" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </nav>
    </div>
  );
}

const RecommendItem: React.FC<{ title: string; desc: string; icon: string; onClick: () => void }> = ({ title, desc, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="divine-card p-10 rounded-[3rem] text-left group flex items-center justify-between"
  >
    <div className="flex gap-8 items-center">
       <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-all duration-500">
         <i className={`fa-solid ${icon} text-2xl`}></i>
       </div>
       <div>
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500/40 mb-2">{desc}</p>
         <h4 className="text-2xl font-bold text-slate-200 bn-serif group-hover:text-white transition-colors">{title}</h4>
       </div>
    </div>
    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-slate-700 group-hover:border-amber-500/50 group-hover:text-amber-500 transition-all">
      <i className="fa-solid fa-chevron-right text-xs"></i>
    </div>
  </button>
);

const MobileNavItem: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'text-slate-500'}`}
  >
    <i className={`fa-solid ${icon} text-lg`}></i>
  </button>
);
