/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Header from './components/Header';
import Hero from './components/Hero';
import ProductShowcase from './components/ProductShowcase';
import SizeChart from './components/SizeChart';
import CheckoutForm from './components/CheckoutForm';
import Footer from './components/Footer';
import AdminDashboard from './components/AdminDashboard';
import { useState, useEffect } from 'react';
import { MetaPixelProvider } from './lib/metaPixel';

export default function App() {
  const [isAdmin, setIsAdmin] = useState(window.location.hash === '#admin');

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(window.location.hash === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (isAdmin) {
    return (
      <div className="h-screen bg-gray-50 font-sans text-gray-900 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 py-3 px-4 md:px-8 flex justify-between items-center shrink-0">
          <h2 className="font-bold flex items-center gap-2 text-sm md:text-base">
             <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-8 h-8 object-contain" />
             StyleCraft Admin Panel
          </h2>
          <button 
            onClick={() => { window.location.hash = ''; }}
            className="text-xs md:text-sm font-bold text-gray-500 hover:text-gray-900 underline"
          >
            Back to Site
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AdminDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <MetaPixelProvider />
      <Header />
      <main>
        <Hero />
        <ProductShowcase />
        <SizeChart />
        <CheckoutForm />
      </main>
      <Footer />
    </div>
  );
}
