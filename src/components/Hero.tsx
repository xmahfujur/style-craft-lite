import { motion } from 'motion/react';
import { CheckCircle, Truck } from 'lucide-react';

export default function Hero() {
  const scrollToProducts = () => {
    const element = document.getElementById('products-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[75vh] sm:min-h-[80vh] flex items-center justify-center overflow-hidden bg-gray-50 py-10 sm:py-12 md:py-16 px-4">
      
      {/* Background blur */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] sm:w-[40%] sm:h-[40%] bg-green-200 rounded-full blur-[100px] sm:blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] sm:w-[40%] sm:h-[40%] bg-blue-100 rounded-full blur-[100px] sm:blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        
        {/* Content */}
        <motion.div
          className="-mt-6 sm:-mt-10 md:-mt-12"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-green-100 text-green-700 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-full mb-3 sm:mb-4">
            Premium Oxford Cotton
          </span>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3 sm:mb-4 leading-[1.2] sm:leading-[1.1]">
            Experience Premium Comfort & Export Quality Shirts
          </h1>

          {/* Pricing block */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-5 sm:mb-6">
            <div className="space-y-1">
              <p className="text-gray-500 text-sm sm:text-lg line-through font-medium opacity-80">
                Regular Price: 1290 Taka
              </p>

              <motion.div 
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex items-center gap-2 sm:gap-3 bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-md border border-green-100"
              >
                <div className="bg-green-500 rounded-md sm:rounded-lg p-1 sm:p-1.5 shrink-0">
                  <CheckCircle className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <span className="text-xl sm:text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  Offer <span className="text-green-600">990৳</span>
                </span>
              </motion.div>
            </div>

            {/* Delivery notice */}
            <div className="relative group">
              <div className="flex items-center gap-2 sm:gap-3 bg-indigo-50 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-indigo-100/50">
                <div className="bg-indigo-600 rounded-md sm:rounded-lg p-1 sm:p-1.5 shrink-0 shadow-sm shadow-indigo-200">
                  <Truck className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <p className="text-indigo-900 font-bold text-xs sm:text-base md:text-lg leading-tight">
                  যেকোন ২ পিস বা তার অধিক শার্ট অর্ডার করলে{' '}
                  <span className="text-rose-600 underline decoration-rose-200 decoration-2 underline-offset-4">
                    ডেলিভারি চার্জ ফ্রি
                  </span>
                </p>
              </div>
              <div className="hidden sm:block absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-indigo-100/50 blur-sm rounded-full" />
            </div>
          </div>
          
          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button 
              onClick={scrollToProducts}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base sm:text-lg shadow-lg shadow-green-100 transition-all transform hover:scale-105 active:scale-95"
            >
              এখনই অর্ডার করুন
            </button>

            <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-white rounded-xl border border-gray-200 shadow-sm text-gray-600 font-medium text-sm sm:text-base">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>৫০০+ খুশি গ্রাহক</span>
            </div>
          </div>
        </motion.div>

        {/* Image */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-6 sm:mt-10 md:mt-12 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl sm:shadow-2xl border-2 sm:border-4 border-white"
        >
          <img 
            src="https://i.ibb.co.com/JgSvwGY/landing-home-picture-768x576.jpg" 
            alt="StyleCraft Premium Shirt Collection - Export Quality Men's Wear in Bangladesh" 
            className="w-full h-auto object-cover aspect-[4/3] sm:aspect-[4/3] md:aspect-[16/9]"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </div>
    </section>
  );
}