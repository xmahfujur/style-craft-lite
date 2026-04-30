import { ShoppingBag } from 'lucide-react';

export default function Header() {
  const scrollToCheckout = () => {
    const element = document.getElementById('checkout-form');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-8 h-8 object-contain" />
          <span className="text-xl font-bold tracking-tight text-gray-900">StyleCraft</span>
        </div>
        
        <button 
          onClick={scrollToCheckout}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full font-medium transition-colors cursor-pointer"
        >
          <ShoppingBag size={18} />
          <span>অর্ডার করুন</span>
        </button>
      </div>
    </header>
  );
}
