
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const SPIRITUAL_SUGGESTIONS = [
  "গীতসংহিতা ২৩", "যোহন ৩:১৬", "১ করিন্থীয় ১৩", "রোমীয় ৮:২৮", 
  "যিশাইয় ৪০:৩১", "হিতোপদেশ ৩:৫-৬", "ফিলিপীয় ৪:১৩", "মথি ১১:২৮",
  "ঈশ্বরের ভালোবাসা", "শান্তি ও সান্ত্বনা", "ক্ষমা ও মুক্তি", "সুরক্ষা প্রার্থনা",
  "যীশু খ্রিস্টের জীবন", "বিশ্বাস ও ধৈর্য", "আশীর্বাদ ও অনুগ্রহ",
  "যোহন ১৪:৬", "গীতসংহিতা ৯১", "মথি ৬:৯-১৩"
];

export default function App() {
  const [activeView, setActiveView] = useState<View>('SEARCH');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<AppState>(AppState.IDLE);
  const [currentVerse, setCurrentVerse] = useState<VerseData | null>(null);
  const [savedVerses, setSavedVerses] = useState<VerseData[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');
  const [fontSize, setFontSize] = useState('base'); 
  const [fontFamily, setFontFamily] = useState('SolaimanLipi');
  const [theme, setTheme] = useState('dark');
  const [error, setError] = useState('');
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [newTagInputId, setNewTagInputId] = useState<string | null>(null);
  const [newTagValue, setNewTagValue] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    if (typeof searchQuery === 'string') {
      setQuery(searchQuery);
    }
    
    setShowSuggestions(false);
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

  const filteredAutoSuggestions = useMemo(() => {
    if (!query.trim()) return SPIRITUAL_SUGGESTIONS.slice(0, 6);
    return SPIRITUAL_SUGGESTIONS.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 6);
  }, [query]);

  const toggleSave = () => {
    if (!currentVerse) return;
    const isSaved = savedVerses.find(v => v.reference === currentVerse.reference);
    if (isSaved) {
      saveToLocal(savedVerses.filter(v => v.reference !== currentVerse.reference));
    } else {
      saveToLocal([{ ...currentVerse, tags: [] }, ...savedVerses]);
    }
  };

  const addTagToVerse = (verseId: string, tag: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag) return;
    const updated = savedVerses.map(v => {
      if (v.id === verseId) {
        const existingTags = v.tags || [];
        if (!existingTags.includes(cleanTag)) {
          return { ...v, tags: [...existingTags, cleanTag] };
        }
      }
      return v;
    });
    saveToLocal(updated);
    setNewTagInputId(null);
    setNewTagValue('');
  };

  const removeTagFromVerse = (verseId: string, tag: string) => {
    const updated = savedVerses.map(v => {
      if (v.id === verseId) {
        return { ...v, tags: (v.tags || []).filter(t => t !== tag) };
      }
      return v;
    });
    saveToLocal(updated);
  };

  const uniqueTags = useMemo(() => {
    const allTags = savedVerses.flatMap(v => v.tags || []);
    return Array.from(new Set(allTags));
  }, [savedVerses]);

  const uniqueThemes = useMemo(() => {
    const allThemes = savedVerses.flatMap(v => v.keyThemes || []);
    return Array.from(new Set(allThemes));
  }, [savedVerses]);

  const tagSuggestions = useMemo(() => {
    if (!newTagValue.trim()) return [];
    return uniqueTags.filter(tag => 
      tag.toLowerCase().includes(newTagValue.toLowerCase())
    ).slice(0, 5);
  }, [newTagValue, uniqueTags]);

  const filteredVerses = useMemo(() => {
    return savedVerses.filter(v => {
      const matchesTag = !filterTag || (v.tags || []).includes(filterTag);
      const matchesTheme = !filterTheme || (v.keyThemes || []).includes(filterTheme);
      return matchesTag && matchesTheme;
    });
  }, [savedVerses, filterTag, filterTheme]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!currentVerse) return;
    const shareText = `${currentVerse.reference}\n\n${currentVerse.text}\n\n- পবিত্র বানী (Sacred Word) অ্যাপ থেকে সংগৃহীত`;
    
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
      {/* Background Glow */}
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] ${theme === 'dark' ? 'bg-amber-400/5' : 'bg-amber-500/10'} blur-[120px] rounded-full -z-10 pointer-events-none`}></div>

      <header className="w-full max-w-7xl mx-auto px-6 pt-10 pb-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] animate-float">
            <i className="fa-solid fa-cross text-white text-2xl"></i>
          </div>
          <div>
            <h1 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} leading-none bn-serif tracking-tight`}>
              পবিত্র <span className="text-divine-gold">বানী</span>
            </h1>
            <p className="text-[14px] text-amber-600 font-bold mt-2 bn-serif">জ্ঞানের আলো, আত্মার শান্তি</p>
          </div>
        </div>
        
        <div className="hidden md:flex divine-glass px-2 py-2 rounded-3xl gap-1">
          <NavItem icon="fa-magnifying-glass" label="সার্চ" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} theme={theme} />
          <NavItem icon="fa-bookmark" label="সংগ্রহ" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} theme={theme} />
          <NavItem icon="fa-sliders" label="সেটিংস" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} theme={theme} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 pb-20 md:pb-6 relative z-10">
        {activeView === 'SEARCH' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-8 md:pb-0">
            <div className="max-w-4xl mx-auto mt-4 md:mt-8 relative" ref={suggestionRef}>
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/15 to-amber-200/15 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>
                <div className="relative">
                  <input 
                    value={query} 
                    onChange={e => { setQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="পবিত্র বাইবেলের পদ বা অধ্যায় লিখুন.."
                    className={`w-full ${theme === 'dark' ? 'bg-slate-900/40' : 'bg-white/80'} backdrop-blur-3xl border border-white/10 pl-10 pr-40 md:pr-64 py-8 rounded-[2.5rem] text-xl md:text-2xl outline-none focus:ring-2 ring-amber-500/50 transition-all ${theme === 'dark' ? 'placeholder-slate-600 text-white' : 'placeholder-slate-400 text-slate-900'} font-bold shadow-3xl bn-serif`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {query && (
                      <button 
                        type="button"
                        onClick={() => { setQuery(''); setShowSuggestions(true); }}
                        className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-amber-500 transition-colors rounded-full"
                      >
                        <i className="fa-solid fa-circle-xmark text-lg"></i>
                      </button>
                    )}
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

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredAutoSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-4 divine-glass rounded-[2rem] p-4 shadow-3xl z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/60 px-6 py-2">প্রস্তাবিত বিষয়সমূহ</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                    {filteredAutoSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearch(suggestion)}
                        className={`text-left px-6 py-4 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-white/5 text-slate-200' : 'hover:bg-black/5 text-slate-800'} font-bold bn-serif flex items-center gap-4 group`}
                      >
                        <i className="fa-solid fa-arrow-right text-[10px] text-amber-500 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"></i>
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {state === AppState.SEARCHING && (
              <div className="flex flex-col items-center py-24 gap-8 animate-pulse">
                <div className="relative w-28 h-28">
                  <div className="absolute inset-0 border-4 border-amber-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin"></div>
                  <i className="fa-solid fa-cross text-amber-500 text-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
                </div>
                <div className="text-center space-y-3">
                  <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-3xl font-black bn-serif`}>ঐশ্বরিক বাইবেলীয় অন্তর্দৃষ্টি খোঁজা হচ্ছে</h3>
                  <p className="text-amber-600/60 text-xs font-black uppercase tracking-widest">দয়া করে কিছুক্ষণ অপেক্ষা করুন...</p>
                </div>
              </div>
            )}

            {state === AppState.ERROR && (
              <div className="max-w-2xl mx-auto divine-glass p-12 md:p-16 rounded-[4rem] text-center border-rose-500/20 shadow-2xl">
                <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 text-4xl mx-auto mb-8 shadow-inner">
                  <i className="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-3xl font-black mb-4 bn-serif`}>তথ্য বিভ্রাট</h3>
                <p className="text-slate-500 text-lg mb-10 bn-serif text-justify">{error}</p>
                <button onClick={() => setState(AppState.IDLE)} className={`px-12 py-5 bg-rose-600 hover:bg-rose-500 rounded-2xl text-white font-black transition-all shadow-lg active:scale-95`}>আবার চেষ্টা করুন</button>
              </div>
            )}

            {currentVerse && state === AppState.IDLE && (
              <div className="max-w-5xl mx-auto space-y-16 pb-24 animate-in slide-in-from-bottom-12 duration-1000">
                <div className="relative group">
                  <div className="absolute -inset-4 bg-amber-500/5 rounded-[4rem] blur-2xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
                  <div className={`relative ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/70'} backdrop-blur-3xl p-12 md:p-20 rounded-[4rem] border border-white/5 overflow-hidden text-center shadow-3xl`}>
                    <div className="absolute top-10 right-10">
                      <button onClick={handleRead} className={`w-16 h-16 flex items-center justify-center rounded-2xl divine-glass transition-all ${isReading ? 'text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'text-amber-500 hover:text-amber-600 hover:scale-105 active:scale-95'}`}>
                        <i className={`fa-solid ${isReading ? 'fa-square' : 'fa-play'} text-xl`}></i>
                      </button>
                    </div>

                    <div className="mb-12 relative">
                      <h2 className={`${mainTextSizeClass} font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} leading-relaxed bn-serif px-8 drop-shadow-sm max-w-4xl mx-auto relative z-10 text-justify`}>
                        {currentVerse.text}
                      </h2>
                    </div>
                    
                    <div className="inline-flex items-center gap-6 px-12 py-4 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-inner">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <p className="text-amber-600 font-black tracking-[0.2em] text-sm md:text-lg bn-serif">{currentVerse.reference}</p>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="divine-card p-12 rounded-[3rem] space-y-8 hover:border-amber-500/20 transition-all group">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-church"></i>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-black text-amber-600 bn-serif">তাত্ত্বিক অর্থ</h4>
                      <div className="h-0.5 w-10 bg-amber-500/20 rounded-full"></div>
                      <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} leading-relaxed bn-serif font-medium text-justify`}>{currentVerse.explanation.theologicalMeaning}</p>
                    </div>
                  </div>

                  <div className="divine-card p-12 rounded-[3rem] space-y-8 hover:border-blue-500/20 transition-all group">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-book-open-reader"></i>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-black text-blue-600 bn-serif">শাস্ত্রীয় প্রেক্ষাপট</h4>
                      <div className="h-0.5 w-10 bg-blue-500/20 rounded-full"></div>
                      <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} leading-relaxed bn-serif font-medium text-justify`}>{currentVerse.explanation.historicalContext}</p>
                    </div>
                  </div>

                  <div className="divine-card p-12 rounded-[3rem] space-y-8 hover:border-emerald-500/20 transition-all group">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <i className="fa-solid fa-cross"></i>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-xl font-black text-emerald-600 bn-serif">খ্রিস্টীয় জীবনচর্চা</h4>
                      <div className="h-0.5 w-10 bg-emerald-500/20 rounded-full"></div>
                      <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} leading-relaxed bn-serif font-medium text-justify`}>{currentVerse.explanation.practicalApplication}</p>
                    </div>
                  </div>
                </div>

                {/* Soulful Prayer Section */}
                <div className="max-w-4xl mx-auto divine-glass p-12 rounded-[4rem] space-y-8 border-amber-500/20 shadow-3xl animate-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 text-3xl shadow-inner animate-pulse">
                      <i className="fa-solid fa-hands-praying"></i>
                    </div>
                    <h4 className="text-2xl font-black text-amber-600 bn-serif">ঐশ্বরিক প্রার্থনা</h4>
                  </div>
                  <div className="relative">
                     <p className={`${explanationSizeClass} ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} leading-relaxed bn-serif font-medium text-justify relative z-10 px-4`}>
                       {currentVerse.prayer}
                     </p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-600/60 font-black text-xs uppercase tracking-[0.4em] bn-serif">আমেন</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-6">
                   {currentVerse.keyThemes.map((themeStr, i) => (
                     <span key={i} className="px-6 py-3 rounded-full divine-glass text-xs font-black text-amber-600/70 uppercase tracking-widest border border-amber-500/10 hover:border-amber-500/40 transition-all cursor-default shadow-sm">{themeStr}</span>
                   ))}
                </div>

                <div className="flex flex-wrap justify-center gap-6 pt-10">
                  <button onClick={toggleSave} className={`flex items-center gap-4 px-12 py-6 rounded-[2.5rem] divine-glass transition-all border-2 ${isCurrentVerseSaved ? 'text-amber-600 bg-amber-500/10 border-amber-500/40 shadow-[0_0_40px_rgba(251,191,36,0.2)]' : 'text-slate-500 border-white/5 hover:border-amber-500/20 hover:text-slate-200'} active:scale-95`}>
                    <i className={`fa-solid ${isCurrentVerseSaved ? 'fa-bookmark' : 'fa-bookmark'} text-xl`}></i>
                    <span className="font-black bn-serif tracking-widest uppercase">{isCurrentVerseSaved ? 'সংগ্রহ থেকে সরান' : 'সংগ্রহে রাখুন'}</span>
                  </button>

                  <button onClick={handleShare} className={`flex items-center gap-4 px-12 py-6 rounded-[2.5rem] divine-glass transition-all border-2 text-slate-500 border-white/5 hover:border-amber-500/20 hover:text-slate-200 active:scale-95 relative group`}>
                    {showCopyFeedback && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] px-6 py-2.5 rounded-full font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-2 shadow-lg">কপি করা হয়েছে!</div>
                    )}
                    <i className="fa-solid fa-share-nodes text-xl group-hover:rotate-12 transition-transform"></i>
                    <span className="font-black bn-serif tracking-widest uppercase">শেয়ার করুন</span>
                  </button>
                </div>
              </div>
            )}

            {!currentVerse && state === AppState.IDLE && (
              <div className="max-w-4xl mx-auto space-y-10 pb-12 md:pb-0">
                <div className="text-center opacity-40">
                  <p className="text-[11px] font-black uppercase tracking-[0.6em] mb-6 text-amber-600">প্রস্তাবিত বাইবেলের পদসমূহ</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="animate-in fade-in slide-in-from-right-12 duration-600 space-y-12 py-10 pb-12 md:pb-0">
            <div className="flex flex-col items-center text-center gap-6 mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
               <div className="flex items-center gap-8">
                 <div className="h-px w-12 md:w-24 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                 <i className="fa-solid fa-bookmark text-amber-500/30 text-2xl"></i>
                 <h2 className={`text-4xl md:text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif leading-none tracking-tight`}>আপনার <span className="text-divine-gold">সংগ্রহ</span></h2>
                 <i className="fa-solid fa-bookmark text-amber-500/30 text-2xl"></i>
                 <div className="h-px w-12 md:w-24 bg-gradient-to-l from-transparent via-amber-500/40 to-transparent"></div>
               </div>
               <p className="text-[11px] text-amber-600 font-black uppercase tracking-[0.6em] bg-amber-500/5 px-8 py-2.5 rounded-full border border-amber-500/10">পবিত্র হৃদয়ে সংরক্ষিত জ্ঞান</p>
            </div>

            {savedVerses.length > 0 && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                {/* Filter Controls Row */}
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between divine-glass p-8 rounded-[3rem] border-white/5 shadow-2xl">
                   {/* Tags Filter Pill List */}
                   <div className="w-full md:w-2/3 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/50 px-2">ট্যাগ ফিল্টার</p>
                      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        <button 
                          onClick={() => setFilterTag(null)}
                          className={`whitespace-nowrap px-6 py-2 rounded-full transition-all text-[11px] font-black uppercase tracking-widest border-2 ${!filterTag ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5 hover:border-amber-500/20'}`}
                        >
                          সব ট্যাগ
                        </button>
                        {uniqueTags.map(tag => (
                          <button 
                            key={tag}
                            onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                            className={`whitespace-nowrap px-6 py-2 rounded-full transition-all text-[11px] font-black uppercase tracking-widest border-2 ${filterTag === tag ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white/5 text-slate-500 border-white/5 hover:border-amber-500/20'}`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                   </div>

                   {/* Key Themes Dropdown Filter */}
                   <div className="w-full md:w-1/3 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/50 px-2">মূল থিম ফিল্টার</p>
                      <div className="relative group/theme-select">
                        <select 
                          value={filterTheme || ''} 
                          onChange={(e) => setFilterTheme(e.target.value || null)}
                          className={`w-full p-4 rounded-2xl border-2 transition-all appearance-none cursor-pointer outline-none focus:border-amber-500/50 shadow-inner ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-200' : 'bg-black/5 border-black/5 text-slate-800'} bn-serif text-sm font-bold`}
                        >
                          <option value="" className="bg-slate-900 text-white">সব থিম</option>
                          {uniqueThemes.map(themeName => (
                            <option key={themeName} value={themeName} className="bg-slate-900 text-white">{themeName}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500/50 group-hover/theme-select:text-amber-500 transition-colors">
                          <i className="fa-solid fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                   </div>
                </div>
                
                {/* Active Filter Clear Info */}
                {(filterTag || filterTheme) && (
                  <div className="flex justify-center">
                    <button 
                      onClick={() => { setFilterTag(null); setFilterTheme(null); }}
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600/60 hover:text-amber-500 transition-colors flex items-center gap-2 group"
                    >
                      <i className="fa-solid fa-xmark group-hover:rotate-90 transition-transform"></i>
                      ফিল্টার পরিষ্কার করুন
                    </button>
                  </div>
                )}
              </div>
            )}

            {filteredVerses.length === 0 ? (
              <div className="divine-glass p-20 md:p-32 text-center rounded-[5rem] opacity-50 shadow-2xl max-w-4xl mx-auto border-dashed border-2 border-white/10">
                <div className="w-24 h-24 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-10">
                  <i className="fa-solid fa-bookmark text-5xl text-slate-500/50"></i>
                </div>
                <p className={`text-2xl bn-serif font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'} mb-10`}>
                  { (filterTag || filterTheme) ? "এই ফিল্টারে কোনো পদ পাওয়া যায়নি" : "বর্তমানে কোনো সংরক্ষিত পদ নেই" }
                </p>
                <button onClick={() => { setFilterTag(null); setFilterTheme(null); setActiveView('SEARCH'); }} className="px-14 py-6 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95">বাইবেলের পদ খুঁজুন</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {filteredVerses.map(v => (
                  <div key={v.id} className="divine-card p-10 rounded-[3.5rem] group flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.03] hover:shadow-3xl hover:border-amber-500/20" onClick={() => { setCurrentVerse(v); setActiveView('SEARCH'); }}>
                    <div className="space-y-8">
                      <div className="flex justify-between items-start">
                        <div className="bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/10">
                          <span className="text-amber-600 font-black text-xs bn-serif tracking-wide">{v.reference}</span>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setNewTagInputId(v.id); }} className="text-slate-500 hover:text-amber-500 transition-colors p-2 divine-glass rounded-xl h-10 w-10 flex items-center justify-center">
                            <i className="fa-solid fa-plus-circle"></i>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); saveToLocal(savedVerses.filter(item => item.id !== v.id)); }} className="text-slate-500 hover:text-rose-500 transition-colors p-2 divine-glass rounded-xl h-10 w-10 flex items-center justify-center">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                      <p className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} bn-serif text-lg leading-relaxed line-clamp-4 font-medium text-justify`}>{v.text}</p>
                    </div>

                    <div className="mt-10 space-y-4">
                      {/* Key Themes List */}
                      <div className="flex flex-wrap gap-2">
                         {v.keyThemes.slice(0, 3).map((themeStr, i) => (
                           <span key={i} className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 bn-serif">{themeStr}</span>
                         ))}
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        {(v.tags || []).map(tag => (
                          <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border border-amber-500/10 rounded-full text-xs font-black text-amber-600 uppercase tracking-widest group/tag hover:border-amber-500/30 transition-all shadow-sm">
                            {tag}
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeTagFromVerse(v.id, tag); }}
                              className="opacity-40 hover:opacity-100 hover:text-rose-500"
                            >
                              <i className="fa-solid fa-xmark"></i>
                            </button>
                          </span>
                        ))}
                      </div>

                      {newTagInputId === v.id && (
                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300" onClick={e => e.stopPropagation()}>
                          {tagSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {tagSuggestions.map(suggestion => (
                                <button 
                                  key={suggestion}
                                  onClick={() => addTagToVerse(v.id, suggestion)}
                                  className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input 
                              autoFocus
                              value={newTagValue}
                              onChange={e => setNewTagValue(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addTagToVerse(v.id, newTagValue); if (e.key === 'Escape') setNewTagInputId(null); }}
                              placeholder="ট্যাগ লিখুন.."
                              className={`flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:ring-1 ring-amber-500/50 ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif`}
                            />
                            <button 
                              onClick={() => addTagToVerse(v.id, newTagValue)}
                              className="bg-amber-600 text-white p-3 rounded-2xl shadow-lg active:scale-90"
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'SETTINGS' && (
          <div className="max-w-4xl mx-auto py-12 space-y-16 animate-in fade-in zoom-in-95 pb-20 md:pb-16">
             <div className="flex items-center gap-8 px-4">
               <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-[2rem] flex items-center justify-center text-slate-500 shadow-inner border border-white/5`}>
                 <i className="fa-solid fa-sliders text-3xl"></i>
               </div>
               <div className="space-y-2">
                 <h2 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif`}>অ্যাপ সেটিংস</h2>
                 <p className="text-amber-600 text-xs font-black uppercase tracking-widest">ব্যক্তিগত পাঠ অভিজ্ঞতা কাস্টমাইজ করুন</p>
               </div>
             </div>

             <div className="space-y-10">
                <div className="divine-glass p-10 md:p-14 rounded-[4rem] space-y-12 shadow-3xl">
                    {/* Theme Selection */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        <h4 className="text-base font-black text-amber-600 uppercase tracking-[0.4em]">থিম পরিবর্তন</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                          <button 
                            onClick={() => handleThemeChange('dark')} 
                            className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${theme === 'dark' ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.15)]' : 'bg-black/5 border-transparent text-slate-500 hover:bg-black/10'}`}
                          >
                            <i className="fa-solid fa-moon text-2xl opacity-50"></i>
                            <span className="font-black tracking-[0.2em] text-[11px] uppercase">ডার্ক থিম</span>
                          </button>
                          <button 
                            onClick={() => handleThemeChange('light')} 
                            className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 ${theme === 'light' ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 shadow-[0_0_50px_rgba(251,191,36,0.15)]' : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'}`}
                          >
                            <i className="fa-solid fa-sun text-2xl opacity-50"></i>
                            <span className="font-black tracking-[0.2em] text-[11px] uppercase">লাইট থিম</span>
                          </button>
                      </div>
                    </div>

                    {/* Font Selection Dropdown */}
                    <div className={`pt-12 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-8`}>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        <h4 className="text-base font-black text-amber-600 uppercase tracking-[0.4em]">ফন্ট নির্বাচন</h4>
                      </div>
                      <div className="relative group/select">
                        <select 
                          value={fontFamily} 
                          onChange={(e) => handleFontChange(e.target.value)}
                          className={`w-full p-6 rounded-2xl border-2 transition-all appearance-none cursor-pointer outline-none focus:border-amber-500/50 shadow-inner ${theme === 'dark' ? 'bg-white/5 border-white/5 text-slate-200' : 'bg-black/5 border-black/5 text-slate-800'} bn-serif text-lg`}
                          style={{ fontFamily: fontFamily }}
                        >
                          {fonts.map(f => (
                            <option key={f.id} value={f.id} className="bg-slate-900 text-white" style={{ fontFamily: f.id }}>{f.name}</option>
                          ))}
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500/50 group-hover/select:text-amber-500 transition-colors">
                          <i className="fa-solid fa-chevron-down"></i>
                        </div>
                      </div>
                    </div>

                    {/* Voice Selection */}
                    <div className={`pt-12 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-8`}>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 bg-emerald-500 rounded-full"></div>
                        <h4 className="text-base font-black text-amber-600 uppercase tracking-[0.4em]">কণ্ঠস্বর নির্বাচন</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {['Kore', 'Zephyr', 'Charon'].map(v => (
                            <button key={v} onClick={() => handleVoiceChange(v)} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 ${selectedVoice === v ? 'bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_50px_rgba(251,191,36,0.15)]' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}>
                              <i className="fa-solid fa-microphone-lines text-2xl opacity-40"></i>
                              <span className="font-black tracking-widest text-[10px] uppercase">{v} কণ্ঠস্বর {v === 'Zephyr' && '(Default)'}</span>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Font Size Selection */}
                    <div className={`pt-12 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-8`}>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 bg-rose-500 rounded-full"></div>
                        <h4 className="text-base font-black text-amber-600 uppercase tracking-[0.4em]">পাঠের অক্ষরের আকার</h4>
                      </div>
                      <div className="flex flex-wrap gap-4">
                          {[{ id: 'sm', label: 'ছোট' }, { id: 'base', label: 'মাঝারি' }, { id: 'lg', label: 'বড়' }, { id: 'xl', label: 'অতিরিক্ত বড়' }].map(size => (
                            <button key={size.id} onClick={() => handleFontSizeChange(size.id)} className={`px-10 py-4 rounded-2xl border-2 transition-all font-black bn-serif text-lg ${fontSize === size.id ? 'bg-amber-500 text-white border-amber-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>{size.label}</button>
                          ))}
                      </div>
                    </div>

                    {/* New Feedback Section */}
                    <div className={`pt-12 border-t ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} space-y-8`}>
                      <div className="flex items-center gap-4">
                        <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        <h4 className="text-base font-black text-amber-600 uppercase tracking-[0.4em]">মতামত জানান</h4>
                      </div>
                      <a 
                        href="mailto:theotonius2012@gmail.com?subject=Sacred Word Feedback" 
                        className={`flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all group ${theme === 'dark' ? 'bg-white/5 border-white/5 hover:border-amber-500/30' : 'bg-black/5 border-black/5 hover:border-amber-500/30'}`}
                      >
                         <div className="flex items-center gap-6">
                           <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                             <i className="fa-solid fa-envelope-open-text text-xl"></i>
                           </div>
                           <div className="space-y-1">
                             <p className={`font-black bn-serif ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>ফিডব্যাক বা সমস্যা রিপোর্ট করুন</p>
                             <p className="text-xs text-slate-500 bn-serif">আপনার মতামত আমাদের অ্যাপটি উন্নত করতে সাহায্য করবে</p>
                           </div>
                         </div>
                         <i className="fa-solid fa-arrow-right-long text-slate-500 group-hover:text-amber-500 group-hover:translate-x-2 transition-all"></i>
                      </a>
                    </div>
                </div>

                {/* Developer Profile Card */}
                <div className={`relative group overflow-hidden divine-glass p-12 md:p-16 rounded-[4.5rem] shadow-3xl border-2 ${theme === 'dark' ? 'border-white/5 hover:border-amber-500/20' : 'border-black/5 hover:border-amber-500/30'} transition-all duration-700`}>
                   <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent blur-[80px] rounded-full -z-10 transition-opacity group-hover:opacity-100 opacity-60"></div>
                   
                   <div className="flex flex-col md:flex-row gap-12 items-center md:items-start relative z-10">
                      <div className="relative">
                        <div className={`w-44 h-44 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'} rounded-[3.5rem] flex items-center justify-center border-4 border-amber-500/10 shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500 ring-4 ring-amber-500/30`}>
                          <img 
                            src="https://lh3.googleusercontent.com/d/1D6PyIunFBqxInBMlP41HTdxHUxe-yMWg" 
                            alt="ডেভলপার" 
                            className="w-full h-full object-cover"
                            loading="eager"
                            crossOrigin="anonymous"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.fallback-profile')) {
                                const fallback = document.createElement('div');
                                fallback.className = 'fallback-profile w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 text-white text-6xl font-black shadow-inner animate-pulse';
                                fallback.innerText = 'S';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        </div>
                        <div className="absolute -bottom-4 -right-4 bg-amber-500 text-white px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg border-4 border-slate-900 group-hover:rotate-6 transition-transform">Lead Engineer</div>
                      </div>

                      <div className="space-y-8 text-center md:text-left flex-1">
                         <div className="space-y-3">
                           <h3 className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'} bn-serif tracking-tight`}>পবিত্র বানী <span className="text-amber-500">ডেভলপার টিম</span></h3>
                           <p className="text-amber-600 font-black text-xs uppercase tracking-[0.5em]">শান্তি ও প্রজ্ঞার কারিগর</p>
                         </div>
                         
                         <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'} leading-relaxed bn-serif text-lg font-medium text-justify max-w-2xl`}>
                           "পবিত্র বানী" অ্যাপটি আধুনিক কৃত্রিম বুদ্ধিমত্তা এবং বাইবেলীয় দর্শনের এক অনবদ্য মেলবন্ধন। আমাদের লক্ষ্য প্রতিটি মানুষের অন্তরে প্রযুক্তির মাধ্যমে শান্তির আলো ও ঐশ্বরিক জ্ঞান পৌঁছে দেয়া।
                         </p>

                         <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <a 
                              href="tel:+8801614802711" 
                              className="flex items-center gap-4 px-8 py-5 bg-amber-600 hover:bg-amber-500 text-white rounded-[2rem] shadow-xl hover:shadow-amber-500/30 active:scale-95 transition-all group/call"
                            >
                              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover/call:rotate-12 transition-transform relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                <i className="fa-solid fa-phone-volume text-lg relative z-10"></i>
                              </div>
                              <span className="font-black bn-serif text-lg tracking-wide">+8801614802711</span>
                            </a>

                            <div className="flex gap-4">
                               <SocialIcon icon="fa-github" link="https://github.com/yourusername" />
                               <SocialIcon icon="fa-linkedin" link="https://www.linkedin.com/in/sobuj-theotonius-biswas/" />
                               <SocialIcon icon="fa-envelope" link="mailto:theotonius2012@gmail.com" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-8 right-8 md:hidden z-50">
        <div className="divine-glass flex justify-around p-5 rounded-[2.5rem] shadow-3xl border-white/10 backdrop-blur-3xl">
          <MobileNavItem icon="fa-magnifying-glass" active={activeView === 'SEARCH'} onClick={() => setActiveView('SEARCH')} />
          <MobileNavItem icon="fa-bookmark" active={activeView === 'SAVED'} onClick={() => setActiveView('SAVED')} />
          <MobileNavItem icon="fa-sliders" active={activeView === 'SETTINGS'} onClick={() => setActiveView('SETTINGS')} />
        </div>
      </nav>
    </div>
  );
}

const RecommendItem: React.FC<{ title: string; desc: string; icon: string; onClick: () => void; theme: string }> = ({ title, desc, icon, onClick, theme }) => (
  <button onClick={onClick} className="divine-card p-12 rounded-[3.5rem] text-left group flex items-center justify-between transition-all hover:scale-[1.03] hover:shadow-2xl hover:border-amber-500/30">
    <div className="flex gap-10 items-center">
       <div className={`w-20 h-20 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'} rounded-[2rem] flex items-center justify-center text-slate-500 group-hover:bg-amber-500/15 group-hover:text-amber-500 transition-all shadow-inner border border-white/5`}>
         <i className={`fa-solid ${icon} text-3xl`}></i>
       </div>
       <div className="space-y-2">
         <p className="text-[11px] font-black uppercase tracking-[0.5em] text-amber-600/50">{desc}</p>
         <h4 className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'} bn-serif group-hover:text-amber-600 transition-colors`}>{title}</h4>
       </div>
    </div>
    <div className={`w-14 h-14 rounded-full border-2 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'} flex items-center justify-center text-slate-500 group-hover:text-amber-500 group-hover:border-amber-500/30 transition-all`}>
      <i className="fa-solid fa-chevron-right text-sm"></i>
    </div>
  </button>
);

const MobileNavItem: React.FC<{ icon: string; active: boolean; onClick: () => void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`w-16 h-16 flex items-center justify-center rounded-2xl transition-all ${active ? 'bg-amber-500 text-white shadow-xl scale-110' : 'text-slate-500 hover:text-slate-300'}`}>
    <i className={`fa-solid ${icon} text-xl`}></i>
  </button>
);

const SocialIcon: React.FC<{ icon: string; link: string }> = ({ icon, link }) => {
  const isDirect = link.startsWith('mailto:') || link.startsWith('tel:');
  return (
    <a 
      href={link}
      target={isDirect ? undefined : "_blank"}
      rel={isDirect ? undefined : "noopener noreferrer"}
      className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-all border-2 border-white/5 hover:border-amber-500/30 shadow-sm active:scale-90"
    >
      <i className={`${icon.includes('envelope') || icon.includes('phone') ? 'fa-solid' : 'fa-brands'} ${icon} text-2xl`}></i>
    </a>
  );
};
