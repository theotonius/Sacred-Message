
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

  // Load saved verses
  useEffect(() => {
    const stored = localStorage.getItem('sacred_verses');
    if (stored) {
      try {
        setSavedVerses(JSON.parse(stored));
      } catch (e) {
        setSavedVerses([]);
      }
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
    stopAudio();
    setCurrentVerse(null); // Clear previous result
    
    try {
      const data = await geminiService.fetchVerseExplanation(finalQuery);
      setCurrentVerse(data);
      setState(AppState.IDLE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'একটি অজানা সমস্যা হয়েছে।');
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
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsReading(false);
      audioSourceRef.current = source;
      source.start(0);
    } catch (e) { 
      setIsReading(false); 
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center">
      {/* Top Nav / Brand */}
      <header className="w-full max-w-5xl px-6 pt-8 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-900/40">
            <i className="fa-solid fa-cross text-white"></i>
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-amber-200">
            পবিত্র বাণী AI
          </h1>
        </div>
        <div className="hidden md:flex glass px-4 py-2 rounded-2xl gap-2">
          <NavItem icon="fa-magnifying-glass" label="অনুসন্ধান" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <NavItem icon="fa-bookmark" label="সংরক্ষিত" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <NavItem icon="fa-gear" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
          <NavItem icon="fa-code" label="ডেভেলপার" active={activeView === 'DEVELOPER'} onClick={() => setActiveView('DEVELOPER')} />
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl p-6 mb-24">
        {activeView === 'SEARCH' && (
          <div className="space-y-12">
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group max-w-2xl mx-auto mt-4">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-500/50 z-10">
                <i className="fa-solid fa-music"></i>
              </div>
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                placeholder="পদ বা গানের লিরিক্স লিখে খুঁজুন..."
                className="w-full glass pl-14 pr-32 py-5 rounded-full text-lg outline-none focus:ring-4 ring-amber-500/10 transition-all placeholder-slate-500 shadow-xl"
              />
              <button 
                type="submit"
                disabled={state === AppState.SEARCHING}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold px-7 py-3 rounded-full shadow-lg transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {state === AppState.SEARCHING ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-magnifying-glass"></i>
                )}
                <span>খুঁজুন</span>
              </button>
            </form>

            {state === AppState.SEARCHING ? (
              <div className="flex flex-col items-center py-24 gap-8">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-star text-amber-500 animate-pulse text-2xl"></i>
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-amber-500 font-bold text-xl tracking-wide animate-pulse">গভীর ব্যাখ্যা বিশ্লেষণ করা হচ্ছে...</p>
                  <p className="text-slate-500 text-sm">AI এর মাধ্যমে আধ্যাত্মিক অর্থ খোঁজা হচ্ছে</p>
                </div>
              </div>
            ) : currentVerse ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                
                {/* Hero Card */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 to-amber-400/20 rounded-[3rem] blur-xl opacity-75"></div>
                  <div className="relative glass p-10 md:p-16 rounded-[3rem] border border-white/10 text-center overflow-hidden">
                    <div className="absolute top-0 left-0 p-8 text-amber-500/10 text-8xl">
                      <i className="fa-solid fa-quote-left"></i>
                    </div>
                    <div className="absolute top-6 right-8 flex gap-3">
                      <button onClick={toggleSave} className={`text-2xl transition-all p-3 rounded-full bg-white/5 hover:bg-white/10 ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400' : 'text-slate-400'}`}>
                        <i className="fa-solid fa-bookmark"></i>
                      </button>
                      <button onClick={handleRead} className={`text-2xl transition-all p-3 rounded-full bg-white/5 hover:bg-white/10 ${isReading ? 'text-rose-500' : 'text-amber-500'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-circle-stop' : 'fa-circle-play'}`}></i>
                      </button>
                    </div>
                    
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 leading-[1.4] bn-serif italic relative z-10 px-4">
                      "{currentVerse.text}"
                    </h2>
                    <div className="inline-block px-8 py-2 bg-amber-500/10 rounded-full border border-amber-500/20 relative z-10">
                      <p className="text-amber-500 font-black tracking-widest text-xl">— {currentVerse.reference} —</p>
                    </div>

                    <div className="mt-10 flex flex-wrap justify-center gap-3">
                      {currentVerse.keyThemes.map((t, idx) => (
                        <span key={idx} className="bg-slate-900/50 text-slate-300 px-4 py-1.5 rounded-full text-sm border border-white/5 font-medium">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <ModernSection 
                      title="মূল অর্থ ও ভাবার্থ" 
                      content={currentVerse.explanation.theologicalMeaning} 
                      icon="fa-dove"
                      color="amber"
                   />
                   <ModernSection 
                      title="পটভূমি ও ইতিহাস" 
                      content={currentVerse.explanation.historicalContext} 
                      icon="fa-landmark-columns"
                      color="slate"
                   />
                </div>

                <div className="relative group">
                   <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-amber-700 rounded-3xl blur opacity-10"></div>
                   <div className="relative glass p-8 md:p-10 rounded-3xl border border-amber-500/10">
                      <h4 className="flex items-center gap-4 text-amber-400 font-bold mb-6 text-2xl bn-serif">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-inner">
                          <i className="fa-solid fa-lightbulb"></i>
                        </div>
                        বাস্তব জীবনে প্রয়োগ
                      </h4>
                      <p className="text-slate-200 text-lg leading-relaxed bn-serif italic">
                        {currentVerse.explanation.practicalApplication}
                      </p>
                   </div>
                </div>

                <div className="flex justify-center pt-6">
                   <button 
                    onClick={() => { setCurrentVerse(null); setQuery(''); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-amber-500 transition-colors font-bold uppercase tracking-widest text-sm"
                   >
                     <i className="fa-solid fa-arrow-left"></i> অন্য কিছু খুঁজুন
                   </button>
                </div>

              </div>
            ) : state === AppState.ERROR ? (
              <div className="glass p-12 text-center rounded-[2.5rem] border-rose-500/20 max-w-2xl mx-auto shadow-2xl">
                <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fa-solid fa-circle-exclamation text-rose-500 text-4xl"></i>
                </div>
                <p className="text-slate-300 text-xl mb-8 leading-relaxed font-medium">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className="px-10 py-4 bg-slate-800 rounded-2xl text-white font-bold hover:bg-slate-700 transition-all active:scale-95">পুনরায় চেষ্টা করুন</button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-10">
                  <h3 className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold">অনুপ্রেরণা নিন</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Suggest title="যোহন ৩:১৬" sub="ঈশ্বরের ভালোবাসা" onClick={() => handleSearch('যোহন ৩:১৬')} />
                  <Suggest title="গীতসংহিতা ২৩" sub="নির্ভরতা" onClick={() => handleSearch('গীতসংহিতা ২৩')} />
                  <Suggest title="মথি ৫:৩-১২" sub="আশীর্বাদ" onClick={() => handleSearch('মথি ৫:৩-১২')} />
                  <Suggest title="ফিলিপীয় ৪:১৩" sub="শক্তি" onClick={() => handleSearch('ফিলিপীয় ৪:১৩')} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved View */}
        {activeView === 'SAVED' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-amber-400 flex items-center gap-4 px-2">
              <i className="fa-solid fa-bookmark text-xl opacity-50"></i> সংরক্ষিত সংকলন
            </h2>
            {savedVerses.length === 0 ? (
              <div className="glass p-24 text-center rounded-[3rem] border-dashed border-white/5">
                <i className="fa-solid fa-folder-open text-slate-800 text-7xl mb-6"></i>
                <p className="text-slate-500 italic text-xl">আপনার সংরক্ষিত ব্যাখ্যাগুলো এখানে দেখা যাবে।</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-8 px-8 py-3 bg-amber-600/10 text-amber-500 rounded-full font-bold hover:bg-amber-600/20 transition-all">সার্চ শুরু করুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedVerses.map(v => (
                  <div key={v.id} className="relative glass rounded-[2rem] overflow-hidden group hover:border-amber-500/30 transition-all border border-white/5 p-8">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-bold text-white bn-serif">{v.reference}</h3>
                      <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-rose-500/30 hover:text-rose-500 transition-all p-2">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <p className="text-slate-400 line-clamp-3 text-lg italic mb-8 bn-serif">"{v.text}"</p>
                    <button onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }} className="w-full py-4 bg-white/5 rounded-2xl text-amber-500 font-bold hover:bg-white/10 transition-all">
                      বিস্তারিত পড়ুন <i className="fa-solid fa-chevron-right text-xs ml-2"></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other Views placeholder */}
        {activeView === 'SETTINGS' && (
          <div className="glass p-12 rounded-[3rem] max-w-2xl mx-auto space-y-10">
            <h2 className="text-3xl font-bold text-amber-400">অ্যাপ সেটিংস</h2>
            <div className="space-y-4">
                <label className="block text-slate-400 text-sm font-bold uppercase tracking-widest">কণ্ঠস্বর (TTS Voice)</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Kore', 'Zephyr', 'Charon', 'Puck'].map((v) => (
                    <button key={v} onClick={() => setSelectedVoice(v)} className={`p-5 rounded-2xl border transition-all text-left font-bold ${selectedVoice === v ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-slate-500'}`}>{v}</button>
                  ))}
                </div>
            </div>
          </div>
        )}
        
        {activeView === 'DEVELOPER' && (
          <div className="glass p-12 rounded-[3rem] max-w-2xl mx-auto text-center space-y-6">
             <i className="fa-solid fa-code text-5xl text-amber-500 mb-4"></i>
             <h2 className="text-3xl font-bold">পবিত্র বাণী AI</h2>
             <p className="text-slate-400 bn-serif">এটি একটি AI চালিত আধ্যাত্মিক অ্যাপ্লিকেশন যা আপনার প্রতিদিনের অনুপ্রেরণার উৎস হতে পারে।</p>
             <p className="text-[10px] text-slate-600 uppercase tracking-widest font-black">Built with Google Gemini 3 Flash</p>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-6 left-6 right-6 glass md:hidden flex justify-around p-5 rounded-full z-50 shadow-2xl">
        <NavItem icon="fa-magnifying-glass" label="" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
        <NavItem icon="fa-bookmark" label="" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
        <NavItem icon="fa-gear" label="" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        <NavItem icon="fa-cross" label="" active={activeView === 'DEVELOPER'} onClick={() => setActiveView('DEVELOPER')} />
      </nav>
    </div>
  );
}

const ModernSection: React.FC<{ title: string; content: string; icon: string; color: 'amber' | 'slate' }> = ({ title, content, icon, color }) => (
  <div className="relative glass p-8 rounded-3xl border border-white/5 flex flex-col h-full">
    <div className={`w-14 h-14 rounded-2xl ${color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'} flex items-center justify-center text-xl mb-6 shadow-lg`}>
      <i className={`fa-solid ${icon}`}></i>
    </div>
    <h4 className="text-xl font-bold text-white mb-4 bn-serif">{title}</h4>
    <p className="text-slate-400 text-base leading-[1.7] bn-serif italic">{content}</p>
  </div>
);

const Suggest: React.FC<{ title: string; sub: string; onClick: () => void }> = ({ title, sub, onClick }) => (
  <button onClick={onClick} className="glass p-8 rounded-[2rem] text-left hover:bg-white/5 transition-all group border border-transparent hover:border-amber-500/20 shadow-lg">
    <div className="flex justify-between items-center mb-4">
      <span className="font-bold text-2xl group-hover:text-amber-400 transition-colors bn-serif">{title}</span>
      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase font-black">{sub}</span>
    </div>
    <p className="text-sm text-slate-500">বিস্তারিত ব্যাখ্যা দেখুন</p>
  </button>
);
