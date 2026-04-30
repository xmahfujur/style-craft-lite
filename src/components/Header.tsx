import { User as UserIcon } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-gray-900">StyleCraft</span>
        </div>
        
        <button 
          onClick={() => { window.location.hash = 'admin'; }}
          className="flex items-center justify-center w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-colors cursor-pointer border border-slate-200"
          title="Admin Panel"
        >
          <UserIcon size={18} />
        </button>
      </div>
    </header>
  );
}

