export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-gray-800 pb-12 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-10 h-10 object-contain" />
              <span className="text-2xl font-black tracking-tighter">StyleCraft</span>
            </div>
            <p className="text-gray-400 max-w-sm leading-relaxed">
              Premium men's fashion brand in Bangladesh focusing on high-quality Oxford cotton shirts. Experience the perfect blend of style, comfort, and craftsmanship.
            </p>
          </div>
          
          <div className="flex flex-wrap md:justify-end gap-x-12 gap-y-4 text-gray-400 font-medium h-fit self-center">
            <a href="#" className="hover:text-white transition-colors">Home</a>
            <a href="#products-section" className="hover:text-white transition-colors">Shirts</a>
            <a href="#checkout-form" className="hover:text-white transition-colors">Order Now</a>
            <a href="#" className="hover:text-white transition-colors">Refund Policy</a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
          <p>© 2026 StyleCraft Bangladesh. All rights reserved.</p>
          <p>Designed for conversion & high-performance selling.</p>
        </div>
      </div>
    </footer>
  );
}
