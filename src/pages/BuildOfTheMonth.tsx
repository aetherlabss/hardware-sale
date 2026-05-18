import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCart } from '../store/useCart';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Eye, Zap, Star, ArrowRight, ShoppingCart, Sparkles, Cpu, Monitor, ChevronRight } from 'lucide-react';

export function BuildOfTheMonth() {
  return (
    <div className="pt-40 pb-24 px-6 max-w-7xl mx-auto min-h-screen text-center flex flex-col items-center justify-center animate-in fade-in duration-1000 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[600px] max-h-[600px] bg-yellow-500/10 blur-[150px] rounded-full pointer-events-none -z-10"></div>
      
      <div className="w-24 h-24 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-8 relative">
        <span className="absolute inset-0 rounded-full bg-yellow-500/20 blur-xl animate-pulse"></span>
        <svg className="w-10 h-10 text-yellow-400 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>

      <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 tracking-tighter mb-6 drop-shadow-2xl">
        BUILD DO MÊS
      </h1>
      <div className="inline-flex items-center gap-2 bg-black/40 border border-white/10 px-4 py-2 rounded-full backdrop-blur-xl mb-8 text-sm font-bold tracking-widest text-gray-400 uppercase">
        <span className="w-2 h-2 rounded-full bg-brand-magenta animate-ping"></span> Coming Soon
      </div>
      <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
        A equipe Hardware Sale está forjando a máquina perfeita deste mês. Uma configuração suprema combinando estética e performance bruta. Fique atento.
      </p>
    </div>
  );
}
