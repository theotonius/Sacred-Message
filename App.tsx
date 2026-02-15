
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from './services/geminiService';
import { VerseData, AppState, View } from './types';

const NavItem: React.FC<{ icon: string; label: string; active: boolean; onClick: () => void; theme: string }> = ({ icon, label, active, onClick, theme }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-3 transition-all px-6 py-3 rounded-2xl group ${active ? 'bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-black/5')}`}
  >
    <i className={`fa-solid ${icon} text-lg group-hover:scale-110 transition-transform`}></i>
    <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
  </button>
);

const fonts = [
  { id: 'SolaimanLipi', name: 'সোলায়মান লিপি' },
  { id: 'Nikosh', name: 'নিকষ' },
  { id: 'Hind Siliguri', name: 'হিন্দ শিলিগুড়ি' },
  { id: 'Mukti', name: 'মুক্তি' },
  { id: 'Ananda', name: 'আনন্দ' },
  { id: 'Kalpurush', name: 'কালপুরুষ' },
  { id: 'SiyamRupali', name: 'সিয়াম রূপালী' },
  { id: 'AdorshoLipi', name: 'আদর্শ লিপি' },
  { id: 'Purno Pran', name: 'পূর্ণ প্রাণ' },
  { id: 'Noto Sans Bengali', name: 'নোটো সান্স' }
];

export default function App() {
  const [activeView, setActiveView] = useState<View>('SEARCH');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [currentVerse, setCurrentVerse] = useState<VerseData | null>(null);
  const [savedVerses, setSavedVerses] = useState<VerseData[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [fontSize, setFontSize] = useState('base'); 
  const [fontFamily, setFontFamily] = useState('SolaimanLipi');
  const [theme, setTheme] = useState('dark');
  const [error, setError] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

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
    const storedTheme = localStorage.getItem('sacred_word_theme');
    if (storedTheme) setTheme(storedTheme);
    const storedFont = localStorage.getItem('sacred_word_font');
    if (storedFont) setFontFamily(storedFont);
  }, []);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', `'${fontFamily}', 'Hind Siliguri', sans-serif`);
  }, [fontFamily]);

  const saveToLocal = (verses: VerseData[]) => {
    localStorage.setItem('sacred_word_verses', JSON.stringify(verses));
    setSavedVerses(verses);
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem('sacred_word_font_size', size);
  };

  const handleFontChange = (font: string) => {
    setFontFamily(font);
    localStorage.setItem('sacred_word_font', font);
  };

  const handleVoiceChange = (voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('sacred_word_voice', voice);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('sacred_word_theme', newTheme);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!currentVerse) return;
    const shareText = `${currentVerse.reference}\n\n"${currentVerse.text}"\n\n- পবিত্র বানী (Sacred Word) অ্যাপ থেকে সংগৃহীত`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'পবিত্র বানী',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
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

  const mainTextSizeClass = {
    sm: 'text-sm md:text-base',
    base: 'text-base md:text-lg lg:text-xl',
    lg: 'text-lg md:text-xl lg:text-2xl',
    xl: 'text-xl md:text-2xl lg:text-3xl'
  }[fontSize as keyof typeof mainTextSizeClass] || 'text-base md:text-lg lg:text-xl';

  const explanationSizeClass = {
    sm: 'text-xs md:text-sm',
    base: 'text-base md:text-lg',
    lg: 'text-lg md:text-xl',
    xl: 'text-xl md:text-2xl'
  }[fontSize as keyof typeof explanationSizeClass] || 'text-base md:text-lg';

  const isCurrentVerseSaved = currentVerse ? !!savedVerses.find(v => v.reference === currentVerse.reference) : false;

  return (
    <div className={`min-h-screen flex flex-col relative transition-colors duration-500`}>
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] ${theme === 'dark' ? 'bg-amber-500/5' : 'bg-amber-500/10'} blur-[120px] rounded-full -z-10 pointer-events-none`}></div>

      <header className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-float">
            <i className="fa-solid fa-cross text-white text-2xl"></i>
          </div>
          <div>
            <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} leading-none bn-serif tracking-tight`}>
              পবিত্র <span className="text-divine-gold">বানী</span>
            </h1>
            <p className="text-[14px] text-amber-600 font-bold mt-2 bn-serif italic">জ্ঞানের আলো, আত্মার শান্তি</p>
          </div>
        </div>
        
        <div className="hidden md:flex divine-glass px-2 py-2 rounded-3xl gap-1">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} theme={theme} />
          <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} theme={theme} />
          <NavItem icon="fa-sliders" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} theme={theme} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 relative z-10">
        {activeView === 'SEARCH' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="max-w-4xl mx-auto mt-4 md:mt-8">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-amber-200/30 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
                <div className="relative">
                  <input 
                    value={query} 
                    onChange={e => setQuery(e.target.value)}
                    placeholder="পবিত্র বাইবেলের পদ বা অধ্যায় লিখুন.."
                    className={`w-full ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-3xl border border-white/20 pl-10 pr-32 md:pr-48 py-8 rounded-[2.5rem] text-xl md:text-2xl outline-none focus:ring-2 ring-amber-500/50 transition-all ${theme === 'dark' ? 'placeholder-slate-400 text-white' : 'placeholder-slate-500 text-slate-900'} font-bold shadow-3xl bn-serif`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                     <button 
                        type="submit"
                        disabled={state === AppState.SEARCHING}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-black px-8 md:px-12 py-5 rounded-full shadow-lg transition-all flex items-center gap-3 disabled:opacity-40 active:scale-95 group/btn overflow-hidden relative"
                      >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform"></div>
                        {state === AppState.SEARCHING ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-magnifying-glass"></i>}
                        <span className="relative z-10 hidden md:inline">সার্চ</span>
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
                  <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-2xl font-bold bn-serif mb-2`}>ঐশ্বরিক বাইবেলীয় অন্তর্দৃষ্টি খোঁজা হচ্ছে</h3>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="max-w-2xl mx-auto divine-glass p-12 rounded-[3rem] text-center border-rose-500/20">
                <i className="fa-solid fa-circle-exclamation text-rose-500 text-5xl mb-6"></i>
                <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-2xl font-black mb-4`}>তথ্য বিভ্রাট</h3>
                <p className="text-slate-500 text-lg mb-10">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className={`px-10 py-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} hover:bg-white/10 rounded-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-black border border-white/5 transition-all`}>আবার চেষ্টা করুন</button>
              </div>
            )}

            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in slide-in-from-bottom-12 duration-1000">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-amber-500/5 rounded-[4rem] blur-2xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
                  <div className={`relative ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-white/60'} backdrop-blur-3xl p-12 md:p-16 rounded-[4rem] border border-white/5 overflow-hidden text-center shadow-2xl`}>
                    <div className="absolute top-10 right-10">
                      <button onClick={handleRead} className={`w-14 h-14 flex items-center justify-center rounded-2xl divine-glass transition-all ${isReading ? 'text-rose-500' : 'text-amber-500 hover:text-amber-600'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-square' : 'fa-play'}`}></i>
                      </button>
                    </div>

                    <div className="mb-10">
                      <i className="fa-solid fa-quote-left text-amber-500/20 text-4xl mb-6"></i>
                      <h2 className={`${mainTextSizeClass} font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} leading-relaxed bn-serif italic px-6 drop-shadow-xl max-w-3xl mx-auto`}>
                        {currentVerse.text}
                      </h2>
                    </div>
                    
                    <div className="inline-flex items-center gap-6 px-10 py-3 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-inner">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-amber-600 font-black tracking-[0.2em] text-sm md:text-base bn-serif">{currentVerse.reference}</p>
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner">
                      <i className="fa-solid fa-church"></i>
                    </div>
                    <h4 className="text-xl font-black text-amber-600 bn-serif flex items-center gap-3">তাত্ত্বিক অর্থ</h4>
                    <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} leading-relaxed bn-serif italic font-light`}>{currentVerse.explanation.theologicalMeaning}</p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner">
                      <i className="fa-solid fa-book-open-reader"></i>
                    </div>
                    <h4 className="text-xl font-black text-blue-600 bn-serif flex items-center gap-3">শাস্ত্রীয় প্রেক্ষাপট</h4>
                    <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} leading-relaxed bn-serif font-light`}>{currentVerse.explanation.historicalContext}</p>
                  </div>

                  <div className="divine-card p-10 rounded-[3rem] space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl shadow-inner">
                      <i className="fa-solid fa-cross"></i>
                    </div>
                    <h4 className="text-xl font-black text-emerald-600 bn-serif flex items-center gap-3">খ্রিস্টীয় জীবনচর্চা</h4>
                    <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} leading-relaxed bn-serif italic font-light`}>{currentVerse.explanation.practicalApplication}</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 pt-10">
                   {currentVerse.keyThemes.map((themeStr, i) => (
                     <span key={i} className="px-6 py-2.5 rounded-full divine-glass text-[10px] font-black text-amber-600/60 uppercase tracking-widest border border-amber-500/10 hover:border-amber-500/40 transition-all cursor-default">{themeStr}</span>
                   ))}
                </div>

                <div className="flex flex-wrap justify-center gap-4 pt-8">
                  <button onClick={toggleSave} className={`flex items-center gap-4 px-10 py-5 rounded-[2rem] divine-glass transition-all border-2 ${isCurrentVerseSaved ? 'text-amber-600 bg-amber-500/10 border-amber-500/40 shadow-[0_0_30px_rgba(251,191,36,0.15)]' : 'text-slate-500 border-white/5 hover:border-amber-500/20 hover:text-slate-700'}`}>
                    <i className={`fa-solid ${isCurrentVerseSaved ? 'fa-bookmark' : 'fa-bookmark'} text-xl`}></i>
                    <span className="font-black bn-serif tracking-widest uppercase">{isCurrentVerseSaved ? 'সংগ্রহ থেকে সরান' : 'সংগ্রহে রাখুন'}</span>
                  </button>

                  <button onClick={handleShare} className={`flex items-center gap-4 px-10 py-5 rounded-[2rem] divine-glass transition-all border-2 text-slate-500 border-white/5 hover:border-amber-500/20 hover:text-slate-700 relative`}>
                    {showCopyFeedback && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] px-4 py-2 rounded-full font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2">কপি করা হয়েছে!</div>
                    )}
                    <i className="fa-solid fa-share-nodes text-xl"></i>
                    <span className="font-black bn-serif tracking-widest uppercase">শেয়ার করুন</span>
                  </button>
                </div>
              </div>
            )}

            {!currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-[0.5em] mb-6">প্রস্তাবিত বাইবেলের পদসমূহ</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RecommendItem title="গীতসংহিতা ২৩" desc="ঐশ্বরিক সুরক্ষা" icon="fa-hands-praying" onClick={() => handleSearch('গীতসংহিতা ২৩')} theme={theme} />
                  <RecommendItem title="যোহন ৩:১৬" desc="ঈশ্বরের ভালোবাসা" icon="fa-heart" onClick={() => handleSearch('যোহন ৩:১৬')} theme={theme} />
                  <RecommendItem title="রোমীয় ৮:২৮" desc="ঐশ্বরিক লক্ষ্য" icon="fa-shield-halved" onClick={() => handleSearch('রোমীয় ৮:২৮')} theme={theme} />
                  <RecommendItem title="মথি ৫:৩-১২" desc="আশীর্বচন" icon="fa-mountain-sun" onClick={() => handleSearch('মথি ৫:৩-১২')} theme={theme} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'SAVED' && (
          <div className="animate-in fade-in slide-in-from-right-12 duration-600 space-y-12 py-10">
            <div className="flex items-end gap-6 mb-16">
               <h2 className={`text-6xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif leading-none`}>আপনার <span className="text-divine-gold">সংগ্রহ</span></h2>
               <div className="h-1 flex-1 bg-white/5 rounded-full mb-3"></div>
            </div>

            {savedVerses.length === 0 ? (
              <div className="divine-glass p-32 text-center rounded-[5rem] opacity-40">
                <i className="fa-solid fa-bookmark text-7xl mb-8"></i>
                <p className={`text-2xl bn-serif italic ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>বর্তমানে কোনো সংরক্ষিত পদ নেই</p>
                <button onClick={() => setActiveView('SEARCH')} className="mt-10 px-12 py-5 bg-amber-600 text-white font-black rounded-2xl hover:scale-105 transition-all">বাইবেলের পদ খুঁজুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {savedVerses.map(v => (
                  <div key={v.id} className="divine-card p-10 rounded-[3rem] group cursor-pointer" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-amber-600 font-black text-sm bn-serif">{v.reference}</span>
                      <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-400 hover:text-rose-500 transition-colors p-2">
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <p className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'} bn-serif text-lg italic line-clamp-3 leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity`}>"{v.text}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'SETTINGS' && (
          <div className="max-w-4xl mx-auto py-12 space-y-12 animate-in fade-in zoom-in-95 pb-32">
             <div className="flex items-center gap-6">
               <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-3xl flex items-center justify-center text-slate-500`}>
                 <i className="fa-solid fa-sliders text-2xl"></i>
               </div>
               <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>অ্যাপ সেটিংস</h2>
             </div>

             <div className="space-y-8">
                <div className="divine-glass p-8 md:p-10 rounded-[4rem] space-y-10">
                    {/* Theme Selection */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] ml-2">থিম পরিবর্তন</h4>
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleThemeChange('dark')} 
                            className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.1)]' : 'bg-black/5 border-transparent text-slate-500 hover:bg-black/10'}`}
                          >
                            <i className="fa-solid fa-moon text-xl opacity-40"></i>
                            <span className="font-black tracking-widest text-[10px] uppercase">ডার্ক থিম</span>
                          </button>
                          <button 
                            onClick={() => handleThemeChange('light')} 
                            className={`p-6 md:p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 shadow-[0_0_40px_rgba(251,191,36,0.1)]' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                          >
                            <i className="fa-solid fa-sun text-xl opacity-40"></i>
                            <span className="font-black tracking-widest text-[10px] uppercase">লাইট থিম</span>
                          </button>
                      </div>
                    </div>

                    {/* Font Selection */}
                    <div className={`pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-6`}>
                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] ml-2">ফন্ট নির্বাচন</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {fonts.map(f => (
                            <button 
                              key={f.id} 
                              onClick={() => handleFontChange(f.id)} 
                              style={{ fontFamily: f.id }}
                              className={`px-6 py-4 rounded-2xl border transition-all text-sm md:text-base ${fontFamily === f.id ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                            >
                              {f.name}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Voice Selection */}
                    <div className={`pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-6`}>
                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] ml-2">কণ্ঠস্বর নির্বাচন</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {['Kore', 'Zephyr', 'Charon', 'Puck'].map(v => (
                            <button key={v} onClick={() => handleVoiceChange(v)} className={`p-4 md:p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_40px_rgba(251,191,36,0.1)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}>
                              <i className="fa-solid fa-microphone-lines text-xl opacity-40"></i>
                              <span className="font-black tracking-widest text-[9px] uppercase">{v} কণ্ঠস্বর</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Font Size Selection */}
                    <div className={`pt-8 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-6`}>
                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] ml-2">পাঠের অক্ষরের আকার</h4>
                      <div className="flex flex-wrap gap-3">
                          {[{ id: 'sm', label: 'ছোট' }, { id: 'base', label: 'মাঝারি' }, { id: 'lg', label: 'বড়' }, { id: 'xl', label: 'অতিরিক্ত বড়' }].map(size => (
                            <button key={size.id} onClick={() => handleFontSizeChange(size.id)} className={`px-6 py-3 rounded-xl border transition-all font-bold bn-serif text-sm ${fontSize === size.id ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>{size.label}</button>
                          ))}
                      </div>
                    </div>
                </div>

                <div className="divine-glass p-10 rounded-[4rem] space-y-8 overflow-hidden relative">
                   <h4 className="text-xs font-black text-amber-600 uppercase tracking-[0.4em] ml-2">ডেভেলপার পরিচিতি</h4>
                   <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                      <div className={`w-32 h-32 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'} rounded-full flex items-center justify-center border border-white/10`}><i className="fa-solid fa-user-tie text-5xl text-slate-400"></i></div>
                      <div className="space-y-4 text-center md:text-left flex-1">
                         <h3 className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif tracking-wide`}>পবিত্র বানী ডেভেলপার টিম</h3>
                         <p className="text-slate-500 leading-relaxed bn-serif text-sm italic">"পবিত্র বানী" অ্যাপটি আধুনিক কৃত্রিম বুদ্ধিমত্তা এবং বাইবেলীয় দর্শনের এক অনবদ্য মেলবন্ধন।</p>
                         <div className="flex justify-center md:justify-start gap-4 pt-4">
                            <SocialIcon icon="fa-github" /><SocialIcon icon="fa-linkedin" /><SocialIcon icon="fa-envelope" />
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-6 right-6 md:hidden z-50">
        <div className="divine-glass flex justify-around p-4 rounded-3xl shadow-2xl border-white/10">
          <MobileNavItem icon="fa-magnifying-glass" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <MobileNavItem icon="fa-bookmark" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <MobileNavItem icon="fa-sliders" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </nav>
    </div>
  );
}

const RecommendItem: React.FC<{ title: string; desc: string; icon: string; onClick: () => void; theme: string }> = ({ title, desc, icon, onClick, theme }) => (
  <button onClick={onClick} className="divine-card p-10 rounded-[3rem] text-left group flex items-center justify-between transition-transform hover:scale-[1.02]">
    <div className="flex gap-8 items-center">
       <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-amber-500/10 group-hover:text-amber-500 transition-all`}><i className={`fa-solid ${icon} text-2xl`}></i></div>
       <div>
         <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600/40 mb-2">{desc}</p>
         <h4 className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} bn-serif group-hover:text-amber-600 transition-colors`}>{title}</h4>
       </div>
    </div>
    <div className={`w-12 h-12 rounded-full border ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-all`}><i className="fa-solid fa-chevron-right text-xs"></i></div>
  </button>
);

const MobileNavItem: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}><i className={`fa-solid ${icon} text-lg`}></i></button>
);

const SocialIcon: React.FC<{ icon: string }> = ({ icon }) => (
  <button className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all border border-white/5"><i className={`fa-brands ${icon} text-lg`}></i></button>
);
