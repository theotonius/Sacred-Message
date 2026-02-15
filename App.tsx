
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
  const [fontSize, setFontSize] = useState('base'); // 'sm', 'base', 'lg', 'xl'
  const [error, setError] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const storedVerses = localStorage.getItem('sacred_word_verses');
    if (storedVerses) {
      try { setSavedVerses(JSON.parse(storedVerses)); } catch (e) { setSavedVerses([]); }
    }
    const storedFontSize = localStorage.getItem('sacred_word_font_size');
    if (storedFontSize) setFontSize(storedFontSize);
    const storedVoice = localStorage.getItem('sacred_word_voice');
    if (storedVoice) setSelectedVoice(storedVoice);
  }, []);

  const saveToLocal = (verses: VerseData[]) => {
    localStorage.setItem('sacred_word_verses', JSON.stringify(verses));
    setSavedVerses(verses);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('sacred_word_font_size', size);
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('sacred_word_voice', voice);
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

  // Font size mapping for the main text
  const mainTextSizeClass = {
    sm: 'text-sm md:text-base',
    base: 'text-base md:text-lg lg:text-xl',
    lg: 'text-lg md:text-xl lg:text-2xl',
    xl: 'text-xl md:text-2xl lg:text-3xl'
  }[fontSize as keyof typeof mainTextSizeClass] || 'text-base md:text-lg lg:text-xl';

  // Font size mapping for explanations
  const explanationSizeClass = {
    sm: 'text-xs md:text-sm',
    base: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl'
  }[fontSize as keyof typeof explanationSizeClass] || 'text-base md:text-lg';

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
            <p className="text-[10px] text-amber-500/60 font-black uppercase tracking-[0.4em] mt-2">Biblical Theology AI</p>
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
                <h2 className="text-white text-xl font-medium tracking-widest uppercase mb-4 opacity-40">Seek Biblical Wisdom</h2>
                <div className="h-0.5 w-16 bg-amber-500 mx-auto rounded-full"></div>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-amber-200/20 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
                <div className="relative">
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="পবিত্র বাইবেলের পদ বা অধ্যায় লিখুন..."
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
                        <span className="relative z-10">বাইবেলীয় বিশ্লেষণ</span>
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
                  <h3 className="text-white text-2xl font-bold bn-serif mb-2">ঐশ্বরিক বাইবেলীয় অন্তর্দৃষ্টি খোঁজা হচ্ছে</h3>
                  <p className="text-slate-500 text-[10px] uppercase tracking-[0.5em] font-black">Biblical AI is meditating...</p>
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
                  <div className="relative bg-slate-900/40 backdrop-blur-3xl p-12 md:p-16 rounded-[4rem] border border-white/5 overflow-hidden text-center shadow-2xl">
                    <div className="absolute top-10 right-10 flex gap-4">
                      <button onClick={toggleSave} className={`w-14 h-14 flex items-center justify-center rounded-2xl divine-glass transition-all ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                        <i className={`fa-solid ${savedVerses.find(v => v.reference === currentVerse.reference) ? 'fa-bookmark' : 'fa-bookmark-o'}`}></i>
                      </button>
                      <button onClick={handleRead} className={`w-14 h-14 flex items-center justify-center rounded-2xl divine-glass transition-all ${isReading ? 'text-rose-500' : 'text-amber-500 hover:text-amber-400'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-square' : 'fa-play'}`}></i>
                      </button>
                    </div>

                    <div className="mb-10">
                      <i className="fa-solid fa-quote-left text-amber-500/20 text-4xl mb-6"></i>
                      {/* Font size is now dynamic */}
                      <h2 className={`${mainTextSizeClass} font-bold text-white leading-relaxed bn-serif italic px-6 drop-shadow-xl max-w-3xl mx-auto`}>
                        {currentVerse.text}
                      </h2>
                    </div>
                    
                    <div className="inline-flex items-center gap-6 px-10 py-3 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-inner">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-amber-500 font-black tracking-[0.2em] text-sm md:text-base bn-serif">{currentVerse.reference}</p>
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Professional Analysis Sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner">
                      <i className="fa-solid fa-church"></i>
                    </div>
                    <h4 className="text-xl font-black text-amber-400 bn-serif flex items-center gap-3">
                      তাত্ত্বিক অর্থ
                    </h4>
                    <p className={`${explanationSizeClass} text-slate-300 leading-relaxed bn-serif italic font-light`}>
                      {currentVerse.explanation.theologicalMeaning}
                    </p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 text-2xl shadow-inner">
                      <i className="fa-solid fa-book-open-reader"></i>
                    </div>
                    <h4 className="text-xl font-black text-blue-400 bn-serif flex items-center gap-3">
                      শাস্ত্রীয় প্রেক্ষাপট
                    </h4>
                    <p className={`${explanationSizeClass} text-slate-400 leading-relaxed bn-serif font-light`}>
                      {currentVerse.explanation.historicalContext}
                    </p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 text-2xl shadow-inner">
                      <i className="fa-solid fa-cross"></i>
                    </div>
                    <h4 className="text-xl font-black text-emerald-400 bn-serif flex items-center gap-3">
                      খ্রিস্টীয় জীবনচর্চা
                    </h4>
                    <p className={`${explanationSizeClass} text-slate-300 leading-relaxed bn-serif italic font-light`}>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-6">Suggested Bible Passages</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RecommendItem 
                    title="গীতসংহিতা ২৩" 
                    desc="Divine Protection" 
                    icon="fa-hands-praying"
                    onClick={() => handleSearch('গীতসংহিতা ২৩')} 
                  />
                  <RecommendItem 
                    title="যোহন ৩:১৬" 
                    desc="God's Love" 
                    icon="fa-heart"
                    onClick={() => handleSearch('যোহন ৩:১৬')} 
                  />
                  <RecommendItem 
                    title="রোমীয় ৮:২৮" 
                    desc="Divine Purpose" 
                    icon="fa-shield-halved"
                    onClick={() => handleSearch('রোমীয় ৮:২৮')} 
                  />
                  <RecommendItem 
                    title="মথি ৫:৩-১২" 
                    desc="The Beatitudes" 
                    icon="fa-mountain-sun"
                    onClick={() => handleSearch('মথি ৫:৩-১২')} 
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
                <i className="fa-solid fa-book-bible text-7xl mb-8"></i>
                <p className="text-2xl bn-serif italic">বর্তমানে কোনো সংরক্ষিত পদ নেই</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-10 px-12 py-5 bg-amber-500 text-black font-black rounded-2xl hover:scale-105 transition-all">বাইবেলের পদ খুঁজুন</button>
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
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in zoom-in-95">
             <div className="flex items-center gap-6">
               <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-slate-400">
                 <i className="fa-solid fa-sliders text-2xl"></i>
               </div>
               <h2 className="text-4xl font-black text-white">অ্যাপ সেটিংস</h2>
             </div>

             <div className="space-y-8">
                {/* Voice & Synthesis */}
                <div className="divine-glass p-10 rounded-[4rem] space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] ml-2">Voice Synthesis</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['Kore', 'Zephyr', 'Charon', 'Puck'].map(v => (
                            <button 
                              key={v}
                              onClick={() => handleVoiceChange(v)}
                              className={`p-6 md:p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.1)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                            >
                              <i className="fa-solid fa-microphone-lines text-2xl opacity-40"></i>
                              <span className="font-black tracking-widest text-[10px] uppercase">{v} Voice</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Font Size Controls */}
                    <div className="pt-8 border-t border-white/5 space-y-6">
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] ml-2">Reading Text Size</h4>
                      <div className="flex flex-wrap gap-4">
                          {[
                            { id: 'sm', label: 'ছোট' },
                            { id: 'base', label: 'মাঝারি' },
                            { id: 'lg', label: 'বড়' },
                            { id: 'xl', label: 'অতিরিক্ত বড়' }
                          ].map(size => (
                            <button 
                              key={size.id}
                              onClick={() => handleFontSizeChange(size.id)}
                              className={`px-8 py-4 rounded-2xl border transition-all font-bold bn-serif ${fontSize === size.id ? 'bg-amber-500 text-black border-amber-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                            >
                              {size.label}
                            </button>
                          ))}
                      </div>
                    </div>
                </div>

                {/* Developer Profile Section */}
                <div className="divine-glass p-10 rounded-[4rem] space-y-8 overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl -z-10 rounded-full translate-x-12 -translate-y-12"></div>
                   
                   <h4 className="text-xs font-black text-amber-500 uppercase tracking-[0.4em] ml-2">Developer Profile</h4>
                   
                   <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                      <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-tr from-amber-500 to-amber-200 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity"></div>
                         <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center relative border border-white/10 overflow-hidden">
                            <i className="fa-solid fa-user-tie text-5xl text-slate-500"></i>
                            {/* You can replace the icon with an actual image tag here if needed */}
                         </div>
                      </div>
                      
                      <div className="space-y-4 text-center md:text-left flex-1">
                         <div>
                            <h3 className="text-2xl font-black text-white bn-serif tracking-wide">পবিত্র বানী ডেভেলপার টিম</h3>
                            <p className="text-amber-500/60 font-black uppercase tracking-widest text-[10px] mt-1">Lead AI Engineer & Biblical Scholar</p>
                         </div>
                         
                         <p className="text-slate-400 leading-relaxed bn-serif text-sm italic">
                           "পবিত্র বানী" অ্যাপটি আধুনিক কৃত্রিম বুদ্ধিমত্তা এবং বাইবেলীয় দর্শনের এক অনবদ্য মেলবন্ধন। আমাদের লক্ষ্য হলো প্রযুক্তির মাধ্যমে পবিত্র বাইবেলের শিক্ষাকে আরও সহজবোধ্য এবং শ্রুতিমধুরভাবে পৌঁছে দেওয়া।
                         </p>
                         
                         <div className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
                            <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all border border-white/5">
                               <i className="fa-brands fa-github text-lg"></i>
                            </button>
                            <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all border border-white/5">
                               <i className="fa-brands fa-linkedin-in text-lg"></i>
                            </button>
                            <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all border border-white/5">
                               <i className="fa-solid fa-envelope text-lg"></i>
                            </button>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="flex justify-between items-center px-10 py-6 opacity-40">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">Version 3.2 Biblical Edition</p>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em]">© পবিত্র বানী (Biblical AI)</p>
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
