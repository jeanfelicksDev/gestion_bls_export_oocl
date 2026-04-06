"use client";

import React from "react";
import { CheckCircle2, Clock } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const isRetire = status === "RETIRE";
  
  if (isRetire) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-emerald-500/5 transition-all animate-in fade-in zoom-in duration-300 ${className}`}>
        <CheckCircle2 className="w-3 h-3" />
        Retiré
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-amber-500/5 transition-all animate-in fade-in zoom-in duration-300 ${className}`}>
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      En attente retrait
    </div>
  );
}
