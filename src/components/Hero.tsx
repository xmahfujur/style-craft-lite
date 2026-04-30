import { motion } from 'motion/react';
import { CheckCircle, Truck } from 'lucide-react';

export default function Hero() {
  const scrollToProducts = () => {
    const element = document.getElementById('products-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gray-50 py-20 px-4">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-200 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 text-sm font-bold uppercase tracking-wider rounded-full mb-6">
            Premium Oxford Cotton
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
            Experience Premium Comfort & Export Quality Shirts
          </h1>
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="space-y-2">
              <p className="text-gray-500 text-lg line-through font-medium opacity-80">
                Regular Price: 1290 Taka
              </p>
              <motion.div 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-md border border-green-100"
              >
                <div className="bg-green-500 rounded-lg p-1.5 shrink-0">
                  <CheckCircle className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                  Offer Price <span className="text-green-600">990 Taka</span>
                </span>
              </motion.div>
            </div>

            <div className="relative group">
              <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100/50">
                <div className="bg-indigo-600 rounded-lg p-1.5 shrink-0 shadow-sm shadow-indigo-200">
                  <Truck className="text-white w-5 h-5" />
                </div>
                <p className="text-indigo-900 font-bold text-base md:text-lg leading-tight">
                  যেকোন ২ পিস বা তার অধিক শার্ট অর্ডার করলে <span className="text-rose-600 underline decoration-rose-200 decoration-2 underline-offset-4">ডেলিভারি চার্জ ফ্রি</span>
                </p>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-indigo-100/50 blur-sm rounded-full" />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={scrollToProducts}
              className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-100 transition-all transform hover:scale-105 active:scale-95"
            >
              এখনই অর্ডার করুন
            </button>
            <div className="flex items-center gap-3 px-6 py-4 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-600 font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>৫০০+ খুশি গ্রাহক</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-16 rounded-3xl overflow-hidden shadow-2xl border-4 border-white"
        >
          <img 
            src="https://i.ibb.co.com/JgSvwGY/landing-home-picture-768x576.jpg" 
            alt="StyleCraft Premium Shirt Collection - Export Quality Men's Wear in Bangladesh" 
            className="w-full h-auto object-cover aspect-[4/3] md:aspect-[16/9]"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>
    </section>
  );
}
