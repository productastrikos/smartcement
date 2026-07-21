import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getModuleBySlug } from '../services/cementKnowledge';

export default function ModulePlaceholder() {
  const { slug } = useParams();
  const mod = getModuleBySlug(slug);

  if (!mod) return <Navigate to="/" replace />;

  return (
    <div className="h-full overflow-y-auto p-1">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-white tracking-tight">{mod.title}</h1>
        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400 border border-slate-600/40">
          Preview
        </span>
      </div>
    </div>
  );
}
