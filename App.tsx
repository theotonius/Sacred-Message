
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
    if (stored) setSavedVerses(JSON.parse(stored));
  }, []);

  const saveToLocal = (verses: VerseData[]) => {
    localStorage.setItem('sacred_verses', JSON.stringify(verses));
    setSavedVerses(verses);
  };

  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = typeof searchQuery === 'string' ? searchQuery : query;
    if (!finalQuery.trim() || state === AppState.SEARCHING) return;

    if (typeof searchQuery === 'string') setQuery(searchQuery);
    
    setState(AppState.SEARCHING);
    setError('');
    stopAudio();
    
    try {
      const data = await geminiService.fetchVerseExplanation(finalQuery);
      setCurrentVerse(data);
      setState(AppState.IDLE);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('403') || err.message?.includes('permission')) {
        setError('এপিআই কী (API Key) এর অনুমতি নেই। অনুগ্রহ করে আপনার এপিআই সেটিংস চেক করুন।');
      } else {
        setError('দুঃখিত, এই পদটি বা তথ্যটি খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক রেফারেন্স দিন।');
      }
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
    } catch (e) { setIsReading(false); }
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
                <i className="fa-solid fa-book-open"></i>
              </div>
              <input 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                placeholder="বাইবেলের পদ লিখে খুঁজুন..."
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
              <div className="flex flex-col items-center py-20 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-amber-500/10 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fa-solid fa-dove text-amber-500 animate-pulse"></i>
                  </div>
                </div>
                <p className="text-amber-500 font-medium animate-pulse text-lg tracking-wide">গভীর আধ্যাত্মিক ব্যাখ্যা তৈরি হচ্ছে...</p>
              </div>
            ) : currentVerse ? (
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                
                {/* Hero Verse Card */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-600/20 to-amber-400/20 rounded-[3rem] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative glass p-10 md:p-16 rounded-[3rem] border border-white/10 text-center overflow-hidden">
                    <div className="absolute top-0 left-0 p-8 text-amber-500/10 text-8xl">
                      <i className="fa-solid fa-quote-left"></i>
                    </div>
                    <div className="absolute bottom-0 right-0 p-8 text-amber-500/10 text-8xl">
                      <i className="fa-solid fa-quote-right"></i>
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
                        <span key={idx} className="bg-slate-900/50 text-slate-300 px-4 py-1.5 rounded-full text-sm border border-white/5 font-medium hover:border-amber-500/30 transition-colors">#{t}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Detailed Explanation Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <ModernSection 
                      title="ধর্মতাত্ত্বিক অন্তর্দৃষ্টি" 
                      content={currentVerse.explanation.theologicalMeaning} 
                      icon="fa-dove"
                      color="amber"
                   />
                   <ModernSection 
                      title="ঐতিহাসিক প্রেক্ষাপট" 
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
                        আমাদের জীবনে প্রয়োগ
                      </h4>
                      <p className="text-slate-200 text-lg leading-relaxed bn-serif italic">
                        {currentVerse.explanation.practicalApplication}
                      </p>
                   </div>
                </div>

                {/* Call to action */}
                <div className="flex justify-center pt-6">
                   <button 
                    onClick={() => { setCurrentVerse(null); setQuery(''); }}
                    className="flex items-center gap-2 text-slate-500 hover:text-amber-500 transition-colors font-bold uppercase tracking-widest text-sm"
                   >
                     <i className="fa-solid fa-arrow-left"></i> অন্য পদ খুঁজুন
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

        {activeView === 'SAVED' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-bold text-amber-400 flex items-center gap-4 px-2">
              <i className="fa-solid fa-bookmark text-xl opacity-50"></i> সংরক্ষিত পদসমূহ
            </h2>
            {savedVerses.length === 0 ? (
              <div className="glass p-24 text-center rounded-[3rem] border-dashed border-white/5">
                <i className="fa-solid fa-folder-open text-slate-800 text-7xl mb-6"></i>
                <p className="text-slate-500 italic text-xl">আপনার প্রিয় পদগুলো এখানে পাওয়া যাবে।</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-8 px-8 py-3 bg-amber-600/10 text-amber-500 rounded-full font-bold hover:bg-amber-600/20 transition-all">নতুন কিছু খুঁজুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {savedVerses.map(v => (
                  <div key={v.id} className="group relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-amber-900 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition"></div>
                    <div className="relative glass rounded-[2rem] overflow-hidden group hover:border-amber-500/30 transition-all border border-white/5 p-8">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-bold text-white bn-serif">{v.reference}</h3>
                        <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-rose-500/30 hover:text-rose-500 hover:scale-125 transition-all p-2">
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                      <p className="text-slate-400 line-clamp-3 text-lg italic mb-8 leading-[1.6] bn-serif">"{v.text}"</p>
                      <button onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); window.scrollTo(0,0); }} className="w-full py-4 bg-white/5 rounded-2xl text-amber-500 font-bold flex items-center justify-center gap-3 hover:bg-white/10 transition-all">
                        বিস্তারিত ব্যাখ্যা <i className="fa-solid fa-chevron-right text-xs"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'SETTINGS' && (
          <div className="glass p-12 rounded-[3rem] max-w-2xl mx-auto space-y-10 animate-in zoom-in-95 duration-300 shadow-2xl border-white/5">
            <h2 className="text-3xl font-bold text-amber-400 flex items-center gap-4">
              <i className="fa-solid fa-gear opacity-50"></i> অ্যাপ সেটিংস
            </h2>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-slate-400 text-sm font-bold uppercase tracking-[0.2em] ml-1">কণ্ঠস্বর নির্বাচন করুন (Voice)</label>
                <div className="grid grid-cols-2 gap-4">
                  {['Kore', 'Zephyr', 'Charon', 'Puck'].map((v) => (
                    <button 
                      key={v}
                      onClick={() => setSelectedVoice(v)}
                      className={`p-5 rounded-2xl border transition-all text-left font-bold ${selectedVoice === v ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                    >
                      <i className={`fa-solid ${selectedVoice === v ? 'fa-circle-check' : 'fa-circle'} text-xs mb-2 block`}></i>
                      {v === 'Kore' ? 'কোর' : v === 'Zephyr' ? 'জেফায়ার' : v === 'Charon' ? 'ক্যারন' : 'পাক'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">পবিত্র বাণী AI • সংস্করণ ১.৩.০</p>
            </div>
          </div>
        )}

        {activeView === 'DEVELOPER' && (
          <div className="glass p-12 md:p-16 rounded-[3rem] max-w-3xl mx-auto text-center space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="relative inline-block">
              <div className="w-28 h-28 bg-gradient-to-br from-amber-600 to-amber-900 rounded-[2rem] mx-auto flex items-center justify-center text-5xl shadow-2xl border-2 border-amber-400/20 relative z-10 rotate-12">
                <i className="fa-solid fa-cross text-white"></i>
              </div>
              <div className="absolute inset-0 bg-amber-500/20 blur-3xl rounded-full scale-150"></div>
            </div>
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-amber-400 bn-serif">পবিত্র বাণী AI</h2>
              <p className="text-slate-300 leading-[1.8] text-xl bn-serif italic px-4">
                "সত্য তোমাদের স্বাধীন করবে।" — যোহন ৮:৩২
              </p>
              <div className="h-px w-20 bg-amber-500/30 mx-auto"></div>
              <p className="text-slate-400 text-lg max-w-lg mx-auto leading-relaxed bn-serif">
                এই অ্যাপ্লিকেশনটি আধুনিক আর্টিফিশিয়াল ইন্টেলিজেন্স ব্যবহার করে বাইবেলের চিরন্তন সত্যকে সহজ বাংলায় আপনার কাছে পৌঁছে দিতে ডিজাইন করা হয়েছে।
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm max-w-md mx-auto">
              <div className="glass p-6 rounded-3xl border-white/5 bg-white/5">
                <p className="text-slate-500 mb-2 font-bold uppercase tracking-widest text-[9px]">ইঞ্জিন</p>
                <p className="font-bold text-amber-200 text-base tracking-wide">Gemini 3 Pro</p>
              </div>
              <div className="glass p-6 rounded-3xl border-white/5 bg-white/5">
                <p className="text-slate-500 mb-2 font-bold uppercase tracking-widest text-[9px]">উন্নয়ন</p>
                <p className="font-bold text-amber-200 text-base tracking-wide">React & TS</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="fixed bottom-6 left-6 right-6 glass md:hidden flex justify-around p-5 rounded-full border-t border-white/10 z-50 shadow-2xl backdrop-blur-3xl">
        <NavItem icon="fa-magnifying-glass" label="" active={activeView === 'SEARCH'} onClick={() => { setActiveView('SEARCH'); window.scrollTo(0,0); }} />
        <NavItem icon="fa-bookmark" label="" active={activeView === 'SAVED'} onClick={() => { setActiveView('SAVED'); window.scrollTo(0,0); }} />
        <NavItem icon="fa-gear" label="" active={activeView === 'SETTINGS'} onClick={() => { setActiveView('SETTINGS'); window.scrollTo(0,0); }} />
        <NavItem icon="fa-cross" label="" active={activeView === 'DEVELOPER'} onClick={() => { setActiveView('DEVELOPER'); window.scrollTo(0,0); }} />
      </nav>

      <footer className="hidden md:block w-full py-12 text-center text-slate-700 text-[10px] font-bold uppercase tracking-[0.5em] opacity-50">
        AD MAJOREM DEI GLORIAM • ২০২৫
      </footer>
    </div>
  );
}

const ModernSection: React.FC<{ title: string; content: string; icon: string; color: 'amber' | 'slate' }> = ({ title, content, icon, color }) => (
  <div className="relative group h-full">
    <div className={`absolute -inset-0.5 bg-gradient-to-br ${color === 'amber' ? 'from-amber-500/20 to-transparent' : 'from-slate-500/20 to-transparent'} rounded-3xl opacity-0 group-hover:opacity-100 transition duration-500`}></div>
    <div className="relative glass p-8 rounded-3xl h-full border border-white/5 group-hover:border-white/10 transition-all flex flex-col">
      <div className={`w-14 h-14 rounded-2xl ${color === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'} flex items-center justify-center text-xl mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
        <i className={`fa-solid ${icon}`}></i>
      </div>
      <h4 className="text-xl font-bold text-white mb-4 bn-serif">{title}</h4>
      <p className="text-slate-400 text-base leading-[1.7] bn-serif italic flex-grow">{content}</p>
    </div>
  </div>
);

const Suggest: React.FC<{ title: string; sub: string; onClick: () => void }> = ({ title, sub, onClick }) => (
  <button onClick={onClick} className="glass p-8 rounded-[2rem] text-left hover:bg-white/5 transition-all group border border-transparent hover:border-amber-500/20 active:scale-[0.98] shadow-lg">
    <div className="flex justify-between items-center mb-4">
      <span className="font-bold text-2xl group-hover:text-amber-400 transition-colors bn-serif tracking-tight">{title}</span>
      <span className="text-[10px] bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full uppercase font-black tracking-widest border border-amber-500/20">{sub}</span>
    </div>
    <p className="text-sm text-slate-500 font-medium opacity-60 group-hover:opacity-100 transition-opacity">AI এর মাধ্যমে বিস্তারিত ব্যাখ্যা দেখুন</p>
  </button>
);
