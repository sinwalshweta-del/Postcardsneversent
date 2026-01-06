
import React, { useState } from 'react';
import { Postcard } from '../types';

interface PostcardViewProps {
  postcard: Postcard;
  variant?: 'large' | 'grid';
  forceSide?: 'front' | 'back';
}

export default function PostcardView({ postcard, variant = 'grid', forceSide }: PostcardViewProps) {
  const [flipped, setFlipped] = useState(false);
  const isLarge = variant === 'large';
  const textClass = "font-handwriting text-zinc-700 text-[16px] md:text-[20px] leading-relaxed";

  // Search query for the stamp image based on inferred country
  const countryQuery = postcard.country.toLowerCase().trim().replace(/\s/g, '-');

  const FrontContent = () => (
    <div className={`bg-[#faf7f0] border border-zinc-200 shadow-2xl flex p-6 gap-6 overflow-hidden rounded-md group w-full h-full text-left ${forceSide ? '' : 'card-front absolute inset-0'}`}>
      <div className="w-1/2 aspect-[3/4] border-[10px] border-white shadow-lg overflow-hidden bg-zinc-50 relative transform transition-transform group-hover:rotate-1">
        {postcard.videoUrl && !forceSide ? (
          <video src={postcard.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={postcard.imageUrl} className="w-full h-full object-cover" alt="Memory Visual" />
        )}
        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      </div>
      
      <div className="w-1/2 flex flex-col pt-10 relative text-left">
        {/* Postage Stamp */}
        <div className="absolute top-0 right-0 w-24 h-28 md:w-32 md:h-40 bg-white border border-zinc-200 p-1.5 shadow-md transform rotate-6 hover:rotate-2 transition-transform duration-500 flex flex-col">
          <div className="flex-grow bg-zinc-50 flex items-center justify-center overflow-hidden border border-zinc-100 relative">
            <img 
              src={`https://loremflickr.com/320/480/${countryQuery},landmark,vintage/all`} 
              className="w-full h-full object-cover grayscale opacity-70 mix-blend-multiply transition-opacity duration-1000" 
              alt={`${postcard.country} stamp`}
              key={countryQuery}
            />
            <div className="absolute inset-0 bg-orange-100/5 pointer-events-none" />
          </div>
          <div className="h-6 md:h-8 flex items-center justify-center bg-white border-t border-zinc-100">
            <span className="font-mono text-[7px] md:text-[9px] uppercase tracking-[0.2em] text-zinc-400 truncate px-1">
              {postcard.country}
            </span>
          </div>
          <div className="absolute inset-0 border-[4px] border-white border-dashed pointer-events-none opacity-50" />
        </div>

        <div className="flex-grow space-y-6 pr-12">
          <div className="border-b border-zinc-50 pb-2">
            <span className="font-mono text-[7px] uppercase block text-zinc-300 tracking-widest">To</span>
            <p className={textClass}>{postcard.toName}</p>
          </div>
          <div className="border-b border-zinc-50 pb-2">
            <span className="font-mono text-[7px] uppercase block text-zinc-300 tracking-widest">From</span>
            <p className={textClass}>{postcard.fromName}</p>
          </div>
        </div>
        
        <div className="mt-auto pb-4">
          <span className="font-serif italic text-zinc-200 text-[10px] block mb-1">distilled memory</span>
          <p className="font-serif italic text-zinc-400 text-base md:text-xl leading-snug tracking-tight">{postcard.location}</p>
        </div>
      </div>
    </div>
  );

  const BackContent = () => (
    <div className={`bg-[#fefcf8] border border-zinc-200 shadow-2xl p-10 flex flex-col rounded-md overflow-hidden w-full h-full text-left ${forceSide ? '' : 'card-back absolute inset-0'}`}>
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-zinc-100 flex items-center justify-center opacity-30">
            <span className="text-[10px] font-mono">01</span>
          </div>
          <span className="font-mono text-[7px] text-zinc-300 uppercase tracking-widest">Personal Archive</span>
        </div>
        <span className="font-mono text-[7px] text-zinc-300 uppercase tracking-widest">{new Date(postcard.timestamp).toLocaleDateString()}</span>
      </div>
      
      <div className="flex-grow overflow-auto pr-4 custom-scrollbar">
        <p className="font-handwriting text-zinc-600 text-lg md:text-2xl leading-[1.8] whitespace-pre-wrap italic opacity-95">
          {postcard.message}
        </p>
      </div>

      <div className="mt-8 pt-8 border-t border-zinc-50 flex justify-between items-end">
        <div>
          <span className="font-title text-4xl text-zinc-200 block select-none mb-1">the words unsaid.</span>
          <span className="font-mono text-[7px] text-zinc-300 uppercase tracking-widest">Aura: {postcard.emotion}</span>
        </div>
        <div className="text-right max-w-[50%]">
          <p className="font-serif italic text-zinc-300 text-lg md:text-xl leading-tight line-clamp-1">{postcard.location}</p>
          <p className="font-mono text-[6px] text-zinc-200 uppercase mt-2 tracking-widest truncate">Ref: {postcard.distilledSentence}</p>
        </div>
      </div>
      
      <div className="absolute top-12 bottom-12 left-1/2 w-[1px] bg-zinc-50 pointer-events-none hidden md:block" />
      <div className="absolute top-0 right-0 p-4 font-mono text-[8px] opacity-5 rotate-90 origin-top-right">AIR MAIL • PAR AVION</div>
    </div>
  );

  // When forceSide is active, we bypass the 3D container for export stability
  if (forceSide) {
    return (
      <div className={`relative w-full aspect-[1.41/1] ${isLarge ? 'max-w-4xl' : 'max-w-md'}`}>
        {forceSide === 'front' ? <FrontContent /> : <BackContent />}
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full aspect-[1.41/1] cursor-pointer ${isLarge ? 'max-w-4xl' : 'max-w-md'}`}
      onClick={() => setFlipped(!flipped)}
      style={{ perspective: '2000px' }}
    >
      <div className={`card-inner relative w-full h-full transition-transform duration-1000 ease-[cubic-bezier(0.34, 1.56, 0.64, 1)] ${flipped ? 'card-flipped' : ''}`}>
        <FrontContent />
        <BackContent />
      </div>
    </div>
  );
}
