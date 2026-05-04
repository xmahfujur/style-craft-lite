import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { SHIPPING_RATES, SIZES } from '../constants';
import { Order, OrderItem, Size, Product } from '../types';
import { Check, Truck, User, MapPin, Phone, Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { trackMetaEvent } from '../lib/metaPixel';

export default function CheckoutForm() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [size, setSize] = useState<Size | null>(null);
  const [shipping, setShipping] = useState<'inside_dhaka' | 'outside_dhaka'>('outside_dhaka');
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderItemsForTracking, setOrderItemsForTracking] = useState<{items: any[], total: number} | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (isSuccess && orderItemsForTracking) {
      trackMetaEvent('Purchase', {
        value: orderItemsForTracking.total,
        currency: 'BDT',
        content_ids: orderItemsForTracking.items.map(i => i.productId),
        contents: orderItemsForTracking.items.map(i => ({
          id: i.productId,
          quantity: i.quantity,
          item_price: i.price
        })),
        content_type: 'product',
        num_items: orderItemsForTracking.items.reduce((acc, curr) => acc + curr.quantity, 0)
      });
    }
  }, [isSuccess, orderItemsForTracking]);

  const productSectionRef = useRef<HTMLDivElement>(null);
  const sizeSectionRef = useRef<HTMLDivElement>(null);
  const addressSectionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const hasStartedForm = useRef(false);

  const handleFieldFocus = () => {
    if (!hasStartedForm.current) {
      trackMetaEvent('InitiateCheckout', {
        content_category: 'checkout',
        num_items: (Array.from(selectedProducts.values()) as number[]).reduce((a: number, b: number) => a + b, 0)
      });
      hasStartedForm.current = true;
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];

      // Sort by priority: high > medium > normal, then by createdAt desc
      const priorityMap = { high: 3, medium: 2, normal: 1 };
      productList.sort((a, b) => {
        const pA = priorityMap[a.priority || 'normal'];
        const pB = priorityMap[b.priority || 'normal'];
        if (pA !== pB) return pB - pA;
        return 0; // fallback to query order (createdAt desc)
      });

      setProducts(productList);
      setLoadingProducts(false);
      
      // Auto-select first product if none selected yet
      if (productList.length > 0 && selectedProducts.size === 0) {
        setSelectedProducts(new Map([[productList[0].id, 1]]));
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      if (next.has(productId)) {
        if (next.size > 1) next.delete(productId);
      } else {
        next.set(productId, 1);
        const product = products.find(p => p.id === productId);
        if (product) {
          trackMetaEvent('AddToCart', {
            content_name: product.name,
            content_ids: [product.id],
            content_type: 'product',
            value: product.price,
            currency: 'BDT'
          });
        }
      }
      return next;
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setSelectedProducts(prev => {
      const next = new Map(prev);
      const current = next.get(productId) as number || 0;
      const newValue = Math.max(1, current + delta);
      next.set(productId, newValue);
      return next;
    });
  };

  const calculateSubtotal = () => {
    let subtotal = 0;
    selectedProducts.forEach((qty, id) => {
      const product = products.find(p => p.id === id);
      if (product) subtotal += product.price * (qty as number);
    });
    return subtotal;
  };

  const subtotal = calculateSubtotal();
  const shippingCost = SHIPPING_RATES[shipping];
  // Free shipping offer for 2+ items? (as seen in SS)
  const isFreeShipping = (Array.from(selectedProducts.values()) as number[]).reduce((a: number, b: number) => a + b, 0) >= 2;
  const finalShippingCost = isFreeShipping ? 0 : shippingCost;
  const total = subtotal + finalShippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation and Auto-scroll
    if (selectedProducts.size === 0) {
      setShowErrors(true);
      setNotification('দয়া করে অন্তত একটি প্রোডাক্ট সিলেক্ট করুন');
      productSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!size) {
      setShowErrors(true);
      setNotification('দয়া করে আপনার বডি সাইজ সিলেক্ট করুন');
      sizeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.name) {
      setShowErrors(true);
      setNotification('দয়া করে আপনার নাম লিখুন');
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.address) {
      setShowErrors(true);
      setNotification('দয়া করে আপনার ঠিকানা লিখুন');
      addressInputRef.current?.focus();
      addressInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.phone) {
      setShowErrors(true);
      setNotification('দয়া করে আপনার মোবাইল নাম্বার লিখুন');
      phoneInputRef.current?.focus();
      phoneInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.name || !form.address || !form.phone || selectedProducts.size === 0 || !size) {
      setShowErrors(true);
      setNotification('দয়া করে সবগুলো ঘর পূরণ করুন');
      return;
    }

    const orderItems: OrderItem[] = [];
    selectedProducts.forEach((qty, id) => {
      const p = products.find(prod => prod.id === id)!;
      orderItems.push({
        productId: id,
        name: p.name,
        quantity: qty,
        price: p.price
      });
    });

    setIsSubmitting(true);
    
    // Track AddPaymentInfo when user clicks the submit button
    trackMetaEvent('AddPaymentInfo', {
      content_category: 'checkout',
      content_ids: orderItems.map(i => i.productId),
      contents: orderItems.map(i => ({ id: i.productId, quantity: i.quantity })),
      value: total,
      currency: 'BDT'
    });

    try {
      const orderData: Order = {
        customerName: form.name,
        address: form.address,
        phoneNumber: form.phone,
        items: orderItems,
        size: size!,
        shippingLocation: shipping,
        totalPrice: total,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      setOrderItemsForTracking({
        items: orderItems,
        total: total
      });

      setIsSuccess(true);
      setSize(null);
      if (products.length > 0) {
        setSelectedProducts(new Map([[products[0].id, 1]]));
      }
      setForm({ name: '', address: '', phone: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProducts) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="animate-spin mx-auto w-10 h-10 text-green-600 mb-4" />
        <p className="text-gray-500 font-medium">অর্ডার ফর্ম লোড হচ্ছে...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Don't show order form if no products
  }

  return (
    <section id="checkout-form" className="py-20 px-4 max-w-5xl mx-auto relative">
      <AnimatePresence>
        {isSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSuccess(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white max-w-lg w-full rounded-3xl p-8 md:p-12 text-center shadow-2xl relative z-10"
            >
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <Check size={48} strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">অর্ডার সফল হয়েছে!</h2>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                ধন্যবাদ! আমাদের প্রতিনিধি শীঘ্রই ফোন করে আপনার অর্ডারটি নিশ্চিত করবেন।
              </p>
              <button 
                onClick={() => setIsSuccess(false)}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-green-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                আরও শার্ট দেখুন
              </button>
            </motion.div>
          </div>
        )}

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 bg-rose-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-ping" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">অর্ডার ফর্ম পূরণ করুন</h2>
        <p className="text-gray-600">নিচের তথ্যাদি পূরণ করে 'Place Order' বাটনে ক্লিক করুন</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Product Selection */}
        <div className="space-y-8">
          <div 
            ref={productSectionRef}
            className={`bg-white p-6 rounded-2xl border-2 transition-all ${showErrors && selectedProducts.size === 0 ? 'border-rose-500 shadow-rose-100 shadow-xl' : 'border-gray-100 shadow-xl shadow-gray-100'}`}
          >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <ShoppingCart size={20} className="text-green-600" />
              আপনার পছন্দের কালার সিলেক্ট করুন
            </h3>

            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl mb-6 border border-green-100 leading-relaxed">
              <span className="font-bold block mb-1">নোট:</span> নিচের যেকোনো একটি প্রোডাক্ট অটোমেটিক সিলেক্ট করা হয়েছে। আপনার অন্য কালার বা একাধিক কালার প্রয়োজন হলে পছন্দমতো সিলেক্ট করুন।
            </div>

            <div className="space-y-4">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedProducts.has(product.id) ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                  onClick={() => toggleProduct(product.id)}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${
                      selectedProducts.has(product.id) ? 'bg-green-500 border-green-500' : 'border-gray-300'
                    }`}>
                      {selectedProducts.has(product.id) && <Check size={14} className="text-white" />}
                    </div>
                    
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="shrink-0 w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                    
                    <div className="flex-1 min-w-0 break-words pr-2">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base leading-tight mb-1">{product.name}</h4>
                      <p className="text-green-600 font-bold text-sm md:text-base leading-none mt-0.5">৳{product.price}</p>
                    </div>

                    {selectedProducts.has(product.id) && (
                      <div className="shrink-0 flex items-center gap-1 md:gap-2 bg-white px-1 md:px-2 py-1 rounded-lg border border-gray-200" onClick={e => e.stopPropagation()}>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(product.id, -1)}
                          className="hover:text-green-600 p-1"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-6 text-center font-bold">{selectedProducts.get(product.id)}</span>
                        <button 
                          type="button"
                          onClick={() => updateQuantity(product.id, 1)}
                          className="hover:text-green-600 p-1"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {isFreeShipping && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium flex items-center gap-2">
                <Truck size={16} />
                আপনি ২ বা তার বেশি শার্ট অর্ডার করছেন - ডেলিভারি চার্জ একদম ফ্রি!
              </div>
            )}
          </div>

          <div 
            ref={sizeSectionRef}
            className={`bg-white p-6 rounded-2xl border-2 transition-all ${showErrors && !size ? 'border-rose-500 shadow-rose-100 shadow-xl' : 'border-gray-100 shadow-xl shadow-gray-100'}`}
          >
            <h3 className="text-xl font-bold mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              আপনার বডি সাইজ কি?
              {!size && (
                <span className={`${showErrors ? 'text-white bg-rose-600 px-4 py-1.5 rounded-full ring-4 ring-rose-100 shadow-lg' : 'text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200'} text-xs font-black animate-pulse uppercase tracking-wider`}>
                  সাইজ সিলেক্ট করা বাধ্যতামূলক *
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-4">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSize(s);
                    trackMetaEvent('CustomizeProduct', {
                      content_type: 'product',
                      size: s
                    });
                  }}
                  className={`w-16 h-16 rounded-2xl border-2 font-black text-xl transition-all relative flex items-center justify-center ${
                    size === s 
                      ? 'border-green-600 bg-green-50 text-green-700 shadow-[0_0_20px_-5px_rgba(22,163,74,0.4)] ring-2 ring-green-600/10' 
                      : (showErrors && !size) ? 'border-rose-200 bg-rose-50/50 text-rose-400' : 'border-gray-200 hover:border-green-400 text-gray-500 hover:text-green-600 bg-white'
                  }`}
                >
                  {s}
                  {size === s && (
                    <motion.div 
                      layoutId="size-indicator"
                      className="absolute -top-1.5 -right-1.5 bg-green-600 text-white rounded-full p-1 shadow-lg border-2 border-white"
                    >
                      <Check size={12} strokeWidth={4} />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Billing & Summary */}
        <div className="space-y-8">
          <div ref={addressSectionRef} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl shadow-gray-100">
            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
              <MapPin size={20} className="text-green-600" />
              আপনার বিস্তারিত ঠিকানা
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">আপনার নাম লিখুন: *</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    ref={nameInputRef}
                    type="text"
                    placeholder="উদা: আব্দুল্লাহ"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all border-2 ${
                      showErrors && !form.name 
                        ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10' 
                        : 'border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white'
                    }`}
                    value={form.name}
                    onFocus={handleFieldFocus}
                    onChange={e => setForm({...form, name: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">আপনার ঠিকানা লিখুন: *</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    ref={addressInputRef}
                    type="text"
                    placeholder="বাসা নং, রোড নং, থানা, জেলা"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all border-2 ${
                      showErrors && !form.address 
                        ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10' 
                        : 'border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white'
                    }`}
                    value={form.address}
                    onFocus={handleFieldFocus}
                    onChange={e => setForm({...form, address: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">আপনার মোবাইল নাম্বার লিখুন: *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-gray-400" size={18} />
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl outline-none transition-all border-2 ${
                      showErrors && !form.phone 
                        ? 'border-rose-500 bg-rose-50 ring-4 ring-rose-500/10' 
                        : 'border-gray-200 bg-gray-50 focus:border-green-500 focus:bg-white'
                    }`}
                    value={form.phone}
                    onFocus={handleFieldFocus}
                    onChange={e => setForm({...form, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <label className="block text-sm font-bold text-gray-700">শিপিং মেথড সিলেক্ট করুন:</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    shipping === 'outside_dhaka' ? 'border-green-500 bg-green-50/50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="shipping" 
                        className="hidden" 
                        checked={shipping === 'outside_dhaka'} 
                        onChange={() => setShipping('outside_dhaka')} 
                      />
                      <span className="font-bold">Outside Dhaka</span>
                    </div>
                    <span className="font-bold">৳110</span>
                  </label>
                  <label className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    shipping === 'inside_dhaka' ? 'border-green-500 bg-green-50/50' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio" 
                        name="shipping" 
                        className="hidden" 
                        checked={shipping === 'inside_dhaka'} 
                        onChange={() => setShipping('inside_dhaka')} 
                      />
                      <span className="font-bold">Inside Dhaka</span>
                    </div>
                    <span className="font-bold">৳70</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">অর্ডার সামারি</h4>
              <div className="space-y-3">
                {Array.from(selectedProducts.entries()).map(([id, qty]) => {
                  const product = products.find(p => p.id === id);
                  if (!product) return null;
                  return (
                    <div key={id} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 flex-1 break-words">
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[10px] font-bold mt-0.5">{qty}x</span>
                        <span className="text-gray-600 leading-tight pr-2">{product.name}</span>
                      </div>
                      <span className="font-bold text-gray-900 shrink-0">৳{product.price * qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-gray-200 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="line-through opacity-50">৳{Array.from(selectedProducts.entries()).reduce((acc: number, [id, qty]) => {
                  const p = products.find(prod => prod.id === id);
                  return acc + ((p?.regularPrice || p?.price || 0) * qty);
                }, 0)}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Discount</span>
                <span>-৳{Array.from(selectedProducts.entries()).reduce((acc: number, [id, qty]) => {
                  const p = products.find(prod => prod.id === id);
                  if (!p || !p.regularPrice) return acc;
                  return acc + ((p.regularPrice - p.price) * qty);
                }, 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>{isFreeShipping ? 'Free' : `৳${finalShippingCost}`}</span>
              </div>
              <div className="flex justify-between text-3xl font-black text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>৳{total}</span>
              </div>
            </div>

            <button
              disabled={isSubmitting}
              className="w-full mt-8 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-green-100 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  অর্ডার হচ্ছে...
                </>
              ) : (
                <>
                  অর্ডার সম্পন্ন করুন ৳{total}
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              পণ্য হাতে পেয়ে মূল্য পরিশোধ করুন (Cash on Delivery)
            </p>
          </div>
        </div>
      </form>
    </section>
  );
}
