import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { motion } from 'motion/react';
import { trackMetaEvent } from '../lib/metaPixel';

export default function ProductShowcase() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productList);
      setLoading(false);
      if (productList.length > 0) {
        trackMetaEvent('ViewContent', {
          content_type: 'product',
          content_ids: productList.slice(0, 5).map(p => p.id), // Top 5
          content_name: 'Product Showcase List',
          value: productList[0].price,
          currency: 'BDT'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOrderClick = (product: Product) => {
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'BDT'
    });
    scrollToCheckout(product.name);
  };

  const scrollToCheckout = (productName?: string) => {
    trackMetaEvent('Lead', { content_name: productName || 'Product Showcase Order Click' });
    const element = document.getElementById('checkout-form');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="py-20 bg-white text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 w-48 mx-auto rounded"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 mt-12">
            {[1, 2, 3].map(i => (
              <div key={i} className="aspect-square bg-gray-100 rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // hide section if no products
  }

  return (
    <section id="products-section" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 italic">Choose Your Style</h2>
          <div className="h-1.5 w-24 bg-green-500 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300"
            >
              <div className="relative aspect-square overflow-hidden">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                  SALE -23%
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-2xl font-black text-green-600">৳{product.price}</span>
                  <span className="text-lg text-gray-400 line-through">৳{product.regularPrice}</span>
                </div>
                
                <button 
                  onClick={() => handleOrderClick(product)}
                  className="w-full py-4 bg-gray-900 group-hover:bg-green-600 text-white rounded-xl font-bold transition-colors active:scale-95"
                >
                  Order Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
