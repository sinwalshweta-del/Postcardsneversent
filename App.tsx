import React, { useState, useEffect, useRef } from 'react';
import { Postcard } from './types';
import { distillTravelVibe, generatePostcardVisual, generatePostcardMotion } from './services/geminiService';
import PostcardView from './components/PostcardView';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

// This tells the computer that 'aistudio' is a valid feature
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}

const Icons = {
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Archive: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  Instagram: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  Refresh: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Sparkles: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/></svg>,
};

const IconButton = ({ icon: Icon, label, onClick, active = false, primary = false }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-2 group transition-all active:scale-90 ${active ? 'scale-110' : ''}`}
  >
    <div className={`p-4 rounded-full border shadow-sm transition-all ${
      primary 
        ? 'bg-zinc-900 text-white border-zinc-900 shadow-zinc-200' 
        : active 
          ? 'bg-zinc-900 text-white border-zinc-900' 
          : 'bg-white border-zinc-100 text-zinc-400 hover:text-zinc-900 hover:border-zinc-300'
    }`}>
      <Icon />
    </div>
    <span className={`text-[10px] tracking-wide lowercase font-medium transition-colors ${active || primary ? 'text-zinc-900' : 'text-zinc-300 group-hover:text-zinc-500'}`}>
      {label}
    </span>
  </button>
);

const App: React.FC = () => {
  const [location, setLocation] = useState('');
  const [toName, setToName] = useState('');
  const [fromName, setFromName] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [message, setMessage] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState<string | null>(null);
  const [currentPostcard, setCurrentPostcard] = useState<Postcard | null>(null);
  const [history, setHistory] = useState<Postcard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  
  const pdfExportRef = useRef<HTMLDivElement>(null);

  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [skipVideo, setSkipVideo] = useState<boolean>(() => {
    return sessionStorage.getItem('postcard_pref_skip_video') === 'true';
  });

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem('postcard_vault');
      if (saved) {
        try { setHistory(JSON.parse(saved)); } catch (e) { console.error("Vault load error", e); }
      }

      if (!window.aistudio) {
        setHasApiKey(true);
      } else {
        if (skipVideo) {
          setHasApiKey(true);
          return;
        }
        try {
          const isSelected = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(isSelected);
        } catch (e) {
          setHasApiKey(true);
        }
      }
    };
    init();
  }, [skipVideo]);

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio) {
        await window.aistudio.openSelectKey();
      }
      setHasApiKey(true);
      setSkipVideo(false);
      sessionStorage.setItem('postcard_pref_skip_video', 'false');
    } catch (e) {
      setHasApiKey(true);
    }
  };

  const handleSkipVideo = () => {
    setSkipVideo(true);
    setHasApiKey(true);
    sessionStorage.setItem('postcard_pref_skip_video', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !thoughts.trim() || !message.trim()) return;

    setIsGenerating(true);
    setError(null);
    setJustAdded(false);
    
    try {
      setGenStep("reading the aura...");
      const vibe = await distillTravelVibe(location, thoughts);
      
      setGenStep("manifesting visuals...");
      const imageUrl = await generatePostcardVisual(vibe, location, thoughts);
      
      let videoUrl = undefined;
      if (!skipVideo) {
        try {
          setGenStep("adding motion...");
          videoUrl = await generatePostcardMotion(vibe, imageUrl);
        } catch (e: any) { 
          console.warn("Motion unavailable, proceeding with static vibe.", e);
        }
      }

      const newPostcard: Postcard = {
        id: crypto.randomUUID(),
        location: location.trim(),
        toName: toName.trim() || 'someone',
        fromName: fromName.trim() || 'me',
        rawInput: thoughts.trim(),
        message: message.trim(),
        imageUrl,
        videoUrl,
        timestamp: Date.now(),
        ...vibe
      };

      setCurrentPostcard(newPostcard);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError("aura check failed. try different words?");
    } finally {
      setIsGenerating(false);
      setGenStep(null);
    }
  };

  const addToCollection = () => {
    if (!currentPostcard) return;
    setHistory(prev => {
      const updated = [currentPostcard, ...prev.filter(p => p.id !== currentPostcard.id)];
      localStorage.setItem('postcard_vault', JSON.stringify(updated));
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
      return updated;
    });
  };

  const downloadAsPdf = async () => {
    if (!pdfExportRef.current) return;
    setIsGenerating(true);
    setGenStep("folding the paper...");

    try {
      await new Promise(r => setTimeout(r, 1500));
      const dataUrl = await toPng(pdfExportRef.current, { 
        quality: 1.0, 
        pixelRatio: 4, 
        backgroundColor: '#fafaf8'
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [1000, 1600] });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`postcard-${location.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`);
    } catch (e) {
      alert("Export failed. Try again?");
    } finally {
      setIsGenerating(false);
      setGenStep(null);
    }
  };

  const shareToInstagram = () => {
    alert("To share on Instagram:\n1. Use 'download pdf' to save your postcard.\n2. Open Instagram and upload your memory to Stories or your Feed!");
    window.open("https://www.instagram.com/", "_blank");
  };

  if (hasApiKey === null) return null;

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fafaf8] text-center">
        <h1 className="font-title text-8xl mb-4 lowercase">vibe check</h1>
        <p className="max-w-xs text-zinc-400 font-serif italic mb-12 text-sm lowercase">
          to see memories in motion, you'll need a paid api key. or keep it still.
        </p>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={handleOpenKeySelector} className="w-full py-5 bg-zinc-900 text-white rounded-full text-[12px] uppercase shadow-xl">connect paid key</button>
          <button onClick={handleSkipVideo} className="w-full py-5 bg-white border border-zinc-200 text-zinc-400 rounded-full text-[12px] uppercase">just the vibe</button>
        </div>
      </div>
    );
  }

  const inputClass = "w-full bg-transparent border-b border-zinc-100 py-3 focus:outline-none focus:border-zinc-400 font-handwriting text-[18px] placeholder:text-zinc-200 transition-colors";

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf8]">
      <div className="fixed -left-[10000px] top-0 pointer-events-none">
        <div ref={pdfExportRef} className="w-[1000px] flex flex-col items-center gap-16 p-20 bg-[#fafaf8] pb-40">
          {currentPostcard && (
            <>
              <PostcardView postcard={currentPostcard} variant="large" forceSide="front" />
              <PostcardView postcard={currentPostcard} variant="large" forceSide="back" />
            </>
          )}
        </div>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center">
          <h2 className="font-title text-5xl text-zinc-900 lowercase">{genStep}</h2>
        </div>
      )}

      <header className="pt-24 pb-16 px-6 text-center">
        <h1 className="font-title text-7xl text-zinc-900 mb-2 lowercase cursor-pointer" onClick={() => setCurrentPostcard(null)}>
          postcards you never sent
        </h1>
        <p className="text-zinc-300 font-serif italic text-lg lowercase">memories that photos missed.</p>
      </header>

      <main className="flex-grow px-6">
        {!currentPostcard ? (
          <div className="max-w-lg mx-auto bg-white p-12 rounded-[3rem] border border-zinc-50 shadow-sm mb-32">
            <form onSubmit={handleSubmit} className="space-y-12">
              <div className="grid grid-cols-2 gap-10">
                <input type="text" value={toName} onChange={e => setToName(e.target.value)} className={inputClass} placeholder="to: who?" />
                <input type="text" value={fromName} onChange={e => setFromName(e.target.value)} className={inputClass} placeholder="from: you?" />
              </div>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputClass} placeholder="where were you?" required />
              <textarea rows={2} value={thoughts} onChange={e => setThoughts(e.target.value)} className={`${inputClass} resize-none`} placeholder="how did it feel?" required />
              <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)} className={`${inputClass} resize-none`} placeholder="what stayed unsaid?" required />
              <button type="submit" className="w-full py-6 bg-zinc-900 text-white rounded-full text-[15px] lowercase shadow-2xl flex items-center justify-center gap-2">
                distill the vibe <Icons.Sparkles />
              </button>
            </form>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col items-center mb-40">
            <PostcardView postcard={currentPostcard} variant="large" />
            <div className="mt-20 flex flex-wrap justify-center gap-10">
              <IconButton icon={Icons.Download} label="download pdf" onClick={downloadAsPdf} />
              <IconButton icon={Icons.Instagram} label="instagram" onClick={shareToInstagram} />
              <IconButton icon={Icons.Archive} label={justAdded ? "vaulted" : "archive"} onClick={addToCollection} active={justAdded} />
              <IconButton icon={Icons.Refresh} label="reset" onClick={() => setCurrentPostcard(null)} primary />
            </div>
            <p className="mt-16 font-serif italic text-zinc-300 text-sm lowercase">tap to flip</p>
          </div>
        )}

        {history.length > 0 && (
          <section className="border-t border-zinc-100 pt-32 pb-60">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-title text-6xl text-center mb-24 lowercase">the archive</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-20 px-6">
                {history.map(pc => (
                  <div key={pc.id} className="relative cursor-pointer transition-transform hover:-translate-y-2" onClick={() => { setCurrentPostcard(pc); window.scrollTo({top:0, behavior:'smooth'}); }}>
                    <PostcardView postcard={pc} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;