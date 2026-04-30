import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Order, Product } from '../types';
import { Package, Phone, MapPin, Calendar, Trash2, Printer, LogOut, LayoutDashboard, ShoppingCart, Users, User as UserIcon, Settings, Search, ChevronLeft, ChevronRight, CheckCircle, XCircle, Table as TableIcon, Trello, PlusCircle, Plus, Minus, Edit2, Save } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { User } from 'firebase/auth';

const PIPELINE_STAGES = [
  { id: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-800' },
  { id: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { id: 'shipped', label: 'Shipped', color: 'bg-purple-100 text-purple-800' },
  { id: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
] as const;

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [printOrder, setPrintOrder] = useState<(Order & { id: string }) | null>(null);
  
  // Dashboard view state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pipeline' | 'table' | 'add_order' | 'inventory' | 'customers' | 'manage_products' | 'settings'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<(Product & { id: string })[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [metaPixelId, setMetaPixelId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Admin Management State
  const [currentAdminPermissions, setCurrentAdminPermissions] = useState<string[]>(['dashboard', 'pipeline', 'table', 'add_order', 'manage_products', 'inventory', 'customers', 'settings']);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>(['dashboard', 'pipeline', 'table', 'add_order', 'manage_products']);


  // Add Order Form State
  const [newOrderForm, setNewOrderForm] = useState({
    customerName: '',
    address: '',
    phoneNumber: '',
    size: 'L',
    shippingLocation: 'outside_dhaka' as 'inside_dhaka' | 'outside_dhaka',
    items: [] as { name: string; quantity: number; price: number }[],
    newItemName: '',
    newItemQuantity: 1,
    newItemPrice: 0,
    editingIndex: -1,
    isSubmitting: false,
  });

  // Manage Products Form State
  const [productForm, setProductForm] = useState({
    id: '', // Empty for new, populated for edit
    name: '',
    price: 0,
    regularPrice: 0,
    image: '',
    color: '',
    priority: 'normal' as 'high' | 'medium' | 'normal',
    isSubmitting: false,
    showForm: false
  });

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.email) {
          await signOut(auth);
          setNotification({ message: 'Email required for admin access.', type: 'error' });
          setUser(null);
          setCheckingAuth(false);
          return;
        }

        if (currentUser.email === 'mr074770@gmail.com') {
          // Super admin always has access
          setCurrentAdminPermissions(['dashboard', 'pipeline', 'table', 'add_order', 'manage_products', 'inventory', 'customers', 'settings']);
          setUser(currentUser);
          setCheckingAuth(false);
        } else {
          // Check if user is in admins collection
          try {
            const { getDoc, doc } = await import('firebase/firestore');
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.email));
            
            if (adminDoc.exists()) {
              const perms = adminDoc.data().permissions || [];
              setCurrentAdminPermissions(perms);
              setUser(currentUser);
              if (perms.length > 0 && !perms.includes(activeTab)) {
                setActiveTab(perms[0]);
              }
            } else {
              await signOut(auth);
              setNotification({ message: 'Unauthorized. Admin access only.', type: 'error' });
              setUser(null);
            }
          } catch (error) {
            console.error('Error checking admin status:', error);
            await signOut(auth);
            setNotification({ message: 'Error verifying admin access.', type: 'error' });
            setUser(null);
          }
          setCheckingAuth(false);
        }
      } else {
        setUser(null);
        setCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Order & { id: string })[];
      setOrders(ordersData);
    }, (error) => {
      console.error("Orders Access Denied", error);
    });

    const qProducts = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as (Product & { id: string })[];
      
      // Sort by priority: high > medium > normal, then by createdAt desc
      const priorityMap = { high: 3, medium: 2, normal: 1 };
      productsData.sort((a, b) => {
        const pA = priorityMap[a.priority || 'normal'];
        const pB = priorityMap[b.priority || 'normal'];
        if (pA !== pB) return pB - pA;
        return 0; // fallback to createdAt (already handled by query order initially, but sort is stable)
      });

      setProducts(productsData);
    }, (error) => {
      console.error("Products Access Denied", error);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setMetaPixelId(snapshot.data().metaPixelId || '');
      }
      setLoading(false);
    }, (error) => {
      console.error("Settings Access Denied", error);
      setLoading(false);
    });

    let unsubscribeAdmins = () => {};
    if (user.email === 'mr074770@gmail.com') {
      unsubscribeAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
        const adminsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAdmins(adminsData);
      }, (error) => {
        console.error("Admins Access Denied", error);
      });
    }

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeSettings();
      unsubscribeAdmins();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        setNotification({ message: "Sign-in popup was closed. Please try again and complete the sign-in.", type: 'error' });
      } else if (error.code === 'auth/popup-blocked') {
        setNotification({ message: "Popup blocked by your browser. Please allow popups for this site, or open the app in a new tab to sign in.", type: 'error' });
      } else {
        setNotification({ message: error.message || "Login failed, please try again.", type: 'error' });
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setNotification({ message: "Please enter email and password.", type: 'error' });
      return;
    }
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        setNotification({ message: "Account created successfully. Awaiting admin approval.", type: 'success' });
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error: any) {
      console.error("Email auth failed:", error);
      if (error.code === 'auth/email-already-in-use') {
        setNotification({ message: "This email is already registered. Please sign in instead.", type: 'error' });
        setIsSignUp(false);
      } else if (error.code === 'auth/weak-password') {
        setNotification({ message: "Password should be at least 6 characters.", type: 'error' });
      } else {
        setNotification({ message: error.message || "Authentication failed, please check your credentials.", type: 'error' });
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      }
    }
  };

  const handlePrint = (order: Order & { id: string }) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
      setPrintOrder(null);
    }, 100);
  };

  // Order Form Handlers
  const handleAddItem = () => {
    if (!newOrderForm.newItemName || newOrderForm.newItemQuantity < 1 || newOrderForm.newItemPrice < 0) {
      setNotification({ message: 'Please fill out product details correctly.', type: 'error' });
      return;
    }
    
    setNewOrderForm(prev => {
      const updatedItems = [...prev.items];
      if (prev.editingIndex >= 0) {
        updatedItems[prev.editingIndex] = {
          name: prev.newItemName,
          quantity: prev.newItemQuantity,
          price: prev.newItemPrice
        };
      } else {
        updatedItems.push({
          name: prev.newItemName,
          quantity: prev.newItemQuantity,
          price: prev.newItemPrice
        });
      }
      return {
        ...prev,
        items: updatedItems,
        newItemName: '',
        newItemQuantity: 1,
        newItemPrice: 0,
        editingIndex: -1
      };
    });
  };

  const editItem = (index: number) => {
    setNewOrderForm(prev => ({
      ...prev,
      newItemName: prev.items[index].name,
      newItemQuantity: prev.items[index].quantity,
      newItemPrice: prev.items[index].price,
      editingIndex: index
    }));
  };

  const deleteItem = (index: number) => {
    setNewOrderForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
      // reset editing tool if we deleted the item we were editing
      ...(prev.editingIndex === index ? { newItemName: '', newItemQuantity: 1, newItemPrice: 0, editingIndex: -1 } : {})
    }));
  };

  const submitNewOrder = async () => {
    if (!newOrderForm.customerName || !newOrderForm.phoneNumber || !newOrderForm.address) {
      setNotification({ message: 'Please provide customer details.', type: 'error' });
      return;
    }
    if (newOrderForm.items.length === 0) {
      setNotification({ message: 'Please add at least one item to the order.', type: 'error' });
      return;
    }

    setNewOrderForm(prev => ({ ...prev, isSubmitting: true }));
    try {
      const orderItems = newOrderForm.items.map(item => ({
        productId: 'manual-' + Math.random().toString(36).substr(2, 9),
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      let subtotal = orderItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
      let totalItemsQty = orderItems.reduce((acc, curr) => acc + curr.quantity, 0);
      const shippingCost = totalItemsQty >= 2 ? 0 : (newOrderForm.shippingLocation === 'inside_dhaka' ? 70 : 110);
      
      await addDoc(collection(db, 'orders'), {
        customerName: newOrderForm.customerName,
        address: newOrderForm.address,
        phoneNumber: newOrderForm.phoneNumber,
        items: orderItems,
        size: newOrderForm.size,
        shippingLocation: newOrderForm.shippingLocation,
        totalPrice: subtotal + shippingCost,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      setNotification({ message: 'Order created successfully!', type: 'success' });
      setNewOrderForm({
        customerName: '',
        address: '',
        phoneNumber: '',
        size: 'L',
        shippingLocation: 'outside_dhaka',
        items: [],
        newItemName: '',
        newItemQuantity: 1,
        newItemPrice: 0,
        editingIndex: -1,
        isSubmitting: false,
      });
      setActiveTab('pipeline'); // redirect back to pipeline
    } catch (error) {
      setNotification({ message: 'Failed to create order. See console for details.', type: 'error' });
      setNewOrderForm(prev => ({ ...prev, isSubmitting: false }));
      try {
        handleFirestoreError(error, OperationType.CREATE, 'orders');
      } catch (e) {
        // Ignored
      }
    }
  };

  // Product Management Handlers
  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !productForm.image) {
      setNotification({ message: 'Please fill out all required product fields.', type: 'error' });
      return;
    }

    setProductForm(prev => ({ ...prev, isSubmitting: true }));
    try {
      const isEditing = !!productForm.id;
      
      const productData: any = {
        name: productForm.name,
        price: Number(productForm.price),
        regularPrice: Number(productForm.regularPrice) || (Number(productForm.price) + 300),
        image: productForm.image,
        color: productForm.color || '',
        priority: productForm.priority || 'normal',
      };

      if (isEditing) {
        // Do NOT send createdAt on update as it is immutable in rules
        await updateDoc(doc(db, 'products', productForm.id), productData);
        setNotification({ message: 'Product updated successfully!', type: 'success' });
      } else {
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
        setNotification({ message: 'Product added successfully!', type: 'success' });
      }

      setProductForm({
        id: '',
        name: '',
        price: 0,
        regularPrice: 0,
        image: '',
        color: '',
        isSubmitting: false,
        showForm: false
      });
    } catch (error) {
      setNotification({ message: 'Failed to save product. See console for details.', type: 'error' });
      setProductForm(prev => ({ ...prev, isSubmitting: false }));
      const path = productForm.id ? `products/${productForm.id}` : 'products';
      try {
        handleFirestoreError(error, productForm.id ? OperationType.UPDATE : OperationType.CREATE, path);
      } catch (e) {}
    }
  };

  const deleteProduct = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product? It will be removed from the store immediately.')) {
      try {
        await deleteDoc(doc(db, 'products', productId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
      }
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.includes('@')) {
      setNotification({ message: 'Enter a valid email address.', type: 'error' });
      return;
    }
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'admins', newAdminEmail), {
        email: newAdminEmail,
        permissions: newAdminPermissions,
        createdAt: serverTimestamp()
      });
      setNotification({ message: 'Admin added successfully!', type: 'success' });
      setNewAdminEmail('');
      setNewAdminPermissions(['dashboard', 'pipeline', 'table', 'add_order', 'manage_products']);
    } catch (error) {
      setNotification({ message: 'Failed to add admin.', type: 'error' });
      try { handleFirestoreError(error, OperationType.CREATE, `admins/${newAdminEmail}`); } catch(e){}
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (window.confirm(`Are you sure you want to remove admin access for ${email}?`)) {
      try {
        await deleteDoc(doc(db, 'admins', email));
        setNotification({ message: 'Admin removed.', type: 'success' });
      } catch(error) {
        setNotification({ message: 'Failed to remove admin.', type: 'error' });
        try { handleFirestoreError(error, OperationType.DELETE, `admins/${email}`); } catch(e){}
      }
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Use setDoc with { merge: true } to create or update the single config document
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'settings', 'config'), {
        metaPixelId: metaPixelId,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setNotification({ message: 'Settings updated successfully!', type: 'success' });
    } catch (error) {
      setNotification({ message: 'Failed to update settings. Check permissions.', type: 'error' });
      try {
        handleFirestoreError(error, OperationType.UPDATE, 'settings/config');
      } catch (e) {}
    } finally {
      setSavingSettings(false);
    }
  };

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600"></div></div>;
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-xl mx-auto mb-6 p-2 shadow-sm">
            <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Enterprise Admin</h2>
          <p className="text-gray-500 mb-8">Sign in for operational control</p>
          {notification && (
            <div className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-sm text-left ${notification.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-green-50 border-green-500 text-green-800'}`}>
              <span className="font-bold">{notification.message}</span>
            </div>
          )}
          <button 
            onClick={handleLogin}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-3 mb-6"
          >
            <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative flex items-center py-4 mb-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Or sign in with email</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50 text-left"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-gray-50 text-left"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredOrders = orders.filter(
    (o) => 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      o.phoneNumber.includes(searchTerm) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Metrics calculation
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.totalPrice, 0);
  const activeOrders = orders.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.status)).length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  // Exact 148.5mm x 210mm formatting constraints
  const renderInvoiceRows = (items: any[]) => {
    // Strict height constraint logic requires truncating rows. A table in A5 landscape can hold ~6 rows maximum including header.
    const MAX_VISIBLE = 5; 
    let rows = [];
    if (items.length <= MAX_VISIBLE) {
      rows = items.map((item, i) => (
        <tr key={i} className="text-[11px] font-medium border-b border-gray-100 last:border-0">
          <td className="py-2 pr-2 font-semibold text-gray-900 truncate max-w-[200px]">{item.name}</td>
          <td className="py-2 text-center text-gray-600 font-bold">{printOrder?.size}</td>
          <td className="py-2 text-center text-gray-800">{item.quantity}</td>
          <td className="py-2 text-right text-gray-600">৳{item.price}</td>
          <td className="py-2 text-right text-gray-900 font-bold">৳{item.price * item.quantity}</td>
        </tr>
      ));
    } else {
      const visibleItems = items.slice(0, MAX_VISIBLE - 1);
      const hiddenItems = items.slice(MAX_VISIBLE - 1);
      const hiddenTotal = hiddenItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
      
      rows = visibleItems.map((item, i) => (
        <tr key={i} className="text-[11px] font-medium border-b border-gray-100">
          <td className="py-2 pr-2 font-semibold text-gray-900 truncate max-w-[200px]">{item.name}</td>
          <td className="py-2 text-center text-gray-600 font-bold">{printOrder?.size}</td>
          <td className="py-2 text-center text-gray-800">{item.quantity}</td>
          <td className="py-2 text-right text-gray-600">৳{item.price}</td>
          <td className="py-2 text-right text-gray-900 font-bold">৳{item.price * item.quantity}</td>
        </tr>
      ));
      
      rows.push(
        <tr key="truncated" className="text-[11px] font-medium bg-gray-50/50">
          <td className="py-2 pr-2 text-gray-500 italic">... +{hiddenItems.length} more items</td>
          <td className="py-2 text-center text-gray-400">-</td>
          <td className="py-2 text-center text-gray-400">-</td>
          <td className="py-2 text-right text-gray-400">-</td>
          <td className="py-2 text-right text-gray-900 font-bold">৳{hiddenTotal}</td>
        </tr>
      );
    }
    return rows;
  };

  return (
    <div className="h-full bg-slate-50 flex print:block print:bg-white text-slate-800 font-sans">
      
      {/* Hidden Invoice for Printing (A5 size) */}
      <div className="hidden print:block fixed inset-0 z-[9999] print:bg-white">
        {printOrder && (
          <div className="w-[210mm] h-[148.5mm] overflow-hidden bg-white text-black font-sans box-border px-8 py-6 relative flex flex-col mx-auto">
            
            {/* Header: Fixed Height */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4 shrink-0">
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900">StyleCraft</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">Enterprise Logistics</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-black uppercase tracking-widest text-slate-300 leading-none">INVOICE</h2>
                <p className="text-[10px] font-mono font-bold mt-1 text-slate-600">ID: {printOrder.id.substring(0, 8).toUpperCase()}</p>
                <p className="text-[10px] font-mono text-slate-500">DATE: {printOrder.createdAt?.toDate ? printOrder.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>

            {/* Meta Info: Fixed Height */}
            <div className="grid grid-cols-2 gap-8 mb-4 shrink-0">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Bill To / Ship To:</h3>
                <p className="text-sm font-black text-slate-900 leading-tight truncate">{printOrder.customerName}</p>
                <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5" title={printOrder.address}>{printOrder.address}</p>
                <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1 mt-1"><Phone size={10} />{printOrder.phoneNumber}</p>
              </div>
              <div className="text-right p-3">
                <h3 className="text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Store Info:</h3>
                <p className="text-[11px] font-bold text-slate-800">StyleCraft Distribution HQ</p>
                <p className="text-[10px] text-slate-500">Gulshan, Dhaka, Bangladesh</p>
                <p className="text-[10px] text-slate-500">Tel: +880 1234 567890</p>
              </div>
            </div>

            {/* Product Table: Adaptive / Constrained Height */}
            <div className="flex-1 overflow-hidden min-h-[0px] border border-slate-200 rounded-lg bg-white">
              <table className="w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left text-[9px] font-black uppercase text-slate-500 tracking-widest">
                    <th className="py-1.5 px-3">Item Description</th>
                    <th className="py-1.5 px-2 text-center w-12">Size</th>
                    <th className="py-1.5 px-2 text-center w-12">Qty</th>
                    <th className="py-1.5 px-3 text-right w-20">Price</th>
                    <th className="py-1.5 px-3 text-right w-20">Total</th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {renderInvoiceRows(printOrder.items)}
                </tbody>
              </table>
            </div>

            {/* Pricing Summary: Fixed Height */}
            <div className="flex justify-between items-end mt-4 pt-4 border-t-2 border-slate-800 shrink-0">
              <div className="text-[9px] text-slate-400 font-medium max-w-[200px]">
                Goods remain the property of StyleCraft until paid in full. Returns accepted within 7 days.
              </div>
              <div className="space-y-1 w-48 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>Subtotal</span>
                  <span className="text-slate-700">৳{printOrder.totalPrice - (printOrder.items.length >= 2 ? 0 : (printOrder.shippingLocation === 'inside_dhaka' ? 70 : 110))}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-500">
                  <span>Shipping</span>
                  <span className="text-slate-700">
                    {printOrder.items.length >= 2 ? 'FREE' : `৳${printOrder.shippingLocation === 'inside_dhaka' ? 70 : 110}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-black pt-2 mt-1 border-t border-slate-300 text-slate-900">
                  <span>GRAND TOTAL</span>
                  <span>৳{printOrder.totalPrice}</span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Sidebar - Enterprise Navigation */}
      <aside className="w-16 md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 transition-all z-20 print:hidden overflow-y-auto overflow-x-hidden">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800 shrink-0">
          <img src="https://i.ibb.co.com/C32Kc2j0/Chat-GPT-Image-Apr-27-2026-06-53-56-PM.png" alt="StyleCraft Logo" className="w-8 h-8 object-contain shrink-0" />
          <span className="hidden md:block ml-3 font-bold text-white tracking-wide">StyleCraft</span>
        </div>
        
        <nav className="flex-1 py-6 space-y-2">
          <div className="px-4 text-xs font-black tracking-widest text-slate-500 uppercase mb-2 hidden md:block">Menu</div>
          
          {currentAdminPermissions.includes('dashboard') && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'dashboard' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <LayoutDashboard size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Dashboard Data</span>
            </button>
          )}

          {currentAdminPermissions.includes('pipeline') && (
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'pipeline' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <Trello size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Pipeline View</span>
            </button>
          )}
          
          {currentAdminPermissions.includes('table') && (
            <button 
              onClick={() => setActiveTab('table')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'table' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <TableIcon size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Orders Data</span>
            </button>
          )}

          {currentAdminPermissions.includes('add_order') && (
            <button 
              onClick={() => setActiveTab('add_order')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'add_order' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <PlusCircle size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Add Order</span>
            </button>
          )}

          {currentAdminPermissions.includes('inventory') && (
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'inventory' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <Package size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Inventory</span>
            </button>
          )}
          
          {currentAdminPermissions.includes('customers') && (
            <button 
              onClick={() => setActiveTab('customers')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'customers' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <Users size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Customers</span>
            </button>
          )}

          {currentAdminPermissions.includes('manage_products') && (
            <button 
              onClick={() => setActiveTab('manage_products')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'manage_products' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <ShoppingCart size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Store Products</span>
            </button>
          )}
          
          {currentAdminPermissions.includes('settings') && (
            <button 
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-4 md:px-6 py-3 transition-colors ${activeTab === 'settings' ? 'bg-slate-800 text-white border-r-2 border-indigo-500' : 'hover:bg-slate-800/50 hover:text-slate-200'}`}
            >
              <Settings size={20} className="shrink-0" />
              <span className="hidden md:block text-sm font-medium">Settings</span>
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-2 py-2 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden md:block text-sm font-medium">Logout Account</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 print:hidden overflow-hidden bg-slate-50/50">
        
        {/* Top App Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex justify-between items-center shrink-0 z-10 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight flex items-center gap-2">
              {activeTab === 'dashboard' && <><LayoutDashboard size={20} className="text-slate-500" /> Analytics & BI</>}
              {activeTab === 'pipeline' && <><Trello size={20} className="text-slate-500" /> Delivery Logistics</>}
              {activeTab === 'table' && <><TableIcon size={20} className="text-slate-500" /> All Orders</>}
              {activeTab === 'add_order' && <><PlusCircle size={20} className="text-slate-500" /> Add Order Profile</>}
              {activeTab === 'inventory' && <><Package size={20} className="text-slate-500" /> Inventory System</>}
              {activeTab === 'customers' && <><Users size={20} className="text-slate-500" /> Customer Intelligence</>}
              {activeTab === 'manage_products' && <><ShoppingCart size={20} className="text-slate-500" /> Global Product Catalog</>}
              {activeTab === 'settings' && <><Settings size={20} className="text-slate-500" /> System Settings</>}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Manage e-commerce operations</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block w-64">
              <input 
                type="text" 
                placeholder="Search order ID, phone..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">{user.displayName}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold overflow-hidden shadow-sm border border-indigo-200">
              {user.photoURL ? <img src={user.photoURL} alt="avatar" /> : user.email?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden p-4 md:p-8 relative">
          {notification && (
            <div className={`absolute top-4 right-4 z-50 p-4 rounded-xl shadow-lg border-l-4 flex items-center gap-3 animate-pulse ${notification.type === 'success' ? 'bg-white border-green-500 text-slate-800' : 'bg-rose-50 border-rose-500 text-rose-800'}`}>
              {notification.type === 'success' ? <CheckCircle className="text-green-500" size={24} /> : <XCircle className="text-rose-500" size={24} />}
              <span className="font-bold">{notification.message}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              {/* DASHBOARD VIEW */}
              {activeTab === 'dashboard' && (
                <div className="h-full overflow-y-auto pr-2 pb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
                      <h3 className="text-3xl font-black text-slate-900">৳{totalRevenue.toLocaleString()}</h3>
                      <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">+12% from last month</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Active Orders</p>
                      <h3 className="text-3xl font-black text-slate-900">{activeOrders}</h3>
                      <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1">Require processing</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Delivered</p>
                      <h3 className="text-3xl font-black text-slate-900">{deliveredOrders}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1">Lifetime total</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Cancelled</p>
                      <h3 className="text-3xl font-black text-slate-900">{cancelledOrders}</h3>
                      <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">Need attention</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute inset-0 bg-slate-50/50 flex flex-col items-center justify-center z-10 backdrop-blur-[1px]">
                         <LayoutDashboard size={48} className="text-slate-300 mb-4" />
                         <p className="text-slate-500 font-bold">Chart component placeholder</p>
                         <p className="text-xs text-slate-400">Available in full enterprise edition</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="font-bold text-slate-900 mb-4">Recent Activity</h3>
                      <div className="space-y-4">
                        {orders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">Order <span className="font-bold">#{o.id.substring(0,8)}</span> was {o.status}</p>
                              <p className="text-xs text-slate-500">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PIPELINE VIEW */}
              {activeTab === 'pipeline' && (
                <div className="flex gap-4 md:gap-6 h-full items-start pb-2 min-w-min">
                  {PIPELINE_STAGES.map((stage) => {
                    const stageOrders = filteredOrders.filter(o => o.status === stage.id);
                    
                    return (
                      <div key={stage.id} className="w-[300px] shrink-0 flex flex-col bg-slate-100/50 rounded-xl h-full max-h-full border border-slate-200/60 shadow-sm">
                        <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 rounded-t-xl shrink-0 backdrop-blur-sm">
                          <h3 className="font-bold text-slate-800 text-sm">{stage.label}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${stage.color}`}>
                            {stageOrders.length}
                          </span>
                        </div>
                        
                        <div className="p-3 gap-3 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                          {stageOrders.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium">
                              Empty queue
                            </div>
                          ) : (
                            stageOrders.map(order => (
                              <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors relative flex flex-col gap-3">
                                
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{order.id.substring(0,6)}</span>
                                    <h4 className="font-bold text-slate-900 leading-tight mt-0.5 max-w-[170px] truncate" title={order.customerName}>
                                      {order.customerName}
                                    </h4>
                                  </div>
                                  <span className="font-black text-sm text-slate-900 bg-slate-100 px-2 py-1 rounded-md">৳{order.totalPrice}</span>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600">
                                  <p className="flex items-center gap-2"><Phone size={12} className="text-slate-400" /> {order.phoneNumber}</p>
                                  <p className="flex text-left gap-2"><MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" /> <span className="line-clamp-2" title={order.address}>{order.address}</span></p>
                                </div>

                                <div className="flex justify-between items-center pt-3 border-t border-slate-100 gap-2">
                                  <select 
                                    value={order.status}
                                    onChange={(e) => updateStatus(order.id, e.target.value)}
                                    className="bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 font-bold flex-1 transition-colors outline-none"
                                  >
                                    {PIPELINE_STAGES.map(s => (
                                      <option key={s.id} value={s.id}>{s.label}</option>
                                    ))}
                                  </select>

                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => handlePrint(order)} className="p-1.5 h-[30px] border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 rounded-md transition-colors" title="Print Invoice">
                                      <Printer size={14} />
                                    </button>
                                    <button onClick={() => deleteOrder(order.id)} className="p-1.5 h-[30px] border border-slate-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-md transition-colors" title="Delete">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* DATA TABLE VIEW */}
              {activeTab === 'table' && (
                <div className="h-full bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
                  <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 box-border border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Order Details</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Customer</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider">Items</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider text-right">Amount</th>
                          <th className="px-6 py-4 text-xs font-black uppercase text-slate-500 tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length === 0 ? (
                           <tr>
                             <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">No orders found matching criteria.</td>
                           </tr>
                        ) : (
                          filteredOrders.map(order => {
                            const stageColor = PIPELINE_STAGES.find(s => s.id === order.status)?.color || 'bg-slate-100 text-slate-800';
                            return (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-indigo-600">#{order.id.substring(0,8).toUpperCase()}</div>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                                  <Calendar size={12} /> {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-slate-900 max-w-[200px] truncate" title={order.customerName}>{order.customerName}</div>
                                <div className="text-xs text-slate-500 max-w-[200px] truncate mt-0.5 flex flex-col gap-0.5">
                                  <span className="flex items-center gap-1"><Phone size={10} />{order.phoneNumber}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select 
                                  value={order.status}
                                  onChange={(e) => updateStatus(order.id, e.target.value)}
                                  className={`text-xs font-bold rounded-full px-3 py-1 outline-none cursor-pointer appearance-none ${stageColor}`}
                                >
                                  {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-slate-800 font-bold mb-1.5 pb-1.5 border-b border-slate-100/50">
                                  {order.items.reduce((acc, curr) => acc + curr.quantity, 0)} Units (Sz: {order.size})
                                </div>
                                <div className="flex flex-col gap-1 text-xs text-slate-600">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start gap-3">
                                      <span className="truncate max-w-[180px] font-medium leading-tight" title={item.name}>
                                        {item.name}
                                      </span>
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                                        x{item.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="text-sm font-black text-slate-900">৳{order.totalPrice}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handlePrint(order)} className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 rounded-lg shadow-sm transition-all">
                                    <Printer size={16} />
                                  </button>
                                  <button onClick={() => deleteOrder(order.id)} className="p-2 bg-white border border-slate-200 text-red-400 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm transition-all">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )})
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADD ORDER VIEW */}
              {activeTab === 'add_order' && (
                <div className="h-full overflow-y-auto px-2 pb-8 custom-scrollbar">
                  <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                         <UserIcon size={20} className="text-slate-500" />
                         Customer Information
                       </h2>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Customer Name *</label>
                           <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="e.g. Abdullah" value={newOrderForm.customerName} onChange={e => setNewOrderForm(p => ({...p, customerName: e.target.value}))} />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Phone Number *</label>
                           <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="01XXXXXXXXX" value={newOrderForm.phoneNumber} onChange={e => setNewOrderForm(p => ({...p, phoneNumber: e.target.value}))} />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Delivery Address *</label>
                           <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" placeholder="Full address" value={newOrderForm.address} onChange={e => setNewOrderForm(p => ({...p, address: e.target.value}))} />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Delivery Area</label>
                           <select className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" value={newOrderForm.shippingLocation} onChange={e => setNewOrderForm(p => ({...p, shippingLocation: e.target.value as 'inside_dhaka'|'outside_dhaka'}))}>
                             <option value="inside_dhaka">Inside Dhaka (৳70)</option>
                             <option value="outside_dhaka">Outside Dhaka (৳110)</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Size</label>
                           <select className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-indigo-500" value={newOrderForm.size} onChange={e => setNewOrderForm(p => ({...p, size: e.target.value}))}>
                             <option value="S">S</option>
                             <option value="M">M</option>
                             <option value="L">L</option>
                             <option value="XL">XL</option>
                             <option value="XXL">XXL</option>
                           </select>
                         </div>
                       </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                         <Package size={20} className="text-slate-500" />
                         Order Items
                       </h2>
                       
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                         <h3 className="text-sm font-bold text-slate-800 mb-3">{newOrderForm.editingIndex >= 0 ? 'Edit Product' : 'Add New Product'}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <div className="md:col-span-2">
                              <label className="block text-xs text-slate-500 mb-1">Product Name</label>
                              <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" placeholder="e.g. Light Sky Oxford" value={newOrderForm.newItemName} onChange={e => setNewOrderForm(p => ({...p, newItemName: e.target.value}))} />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">Price (৳)</label>
                              <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" min="0" value={newOrderForm.newItemPrice} onChange={e => setNewOrderForm(p => ({...p, newItemPrice: Number(e.target.value)}))} />
                            </div>
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="block text-xs text-slate-500 mb-1">Qty</label>
                                <input type="number" className="w-full border border-slate-300 rounded p-2 text-sm outline-none focus:border-indigo-500" min="1" value={newOrderForm.newItemQuantity} onChange={e => setNewOrderForm(p => ({...p, newItemQuantity: Number(e.target.value)}))} />
                              </div>
                              <button type="button" onClick={handleAddItem} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded shrink-0 self-end transition-colors flex items-center justify-center">
                                {newOrderForm.editingIndex >= 0 ? <Save size={18} /> : <Plus size={18} />}
                              </button>
                            </div>
                         </div>
                       </div>

                       <div className="space-y-2">
                         {newOrderForm.items.length === 0 ? (
                           <div className="text-center py-6 text-slate-500 text-sm italic">No products added yet.</div>
                         ) : (
                           newOrderForm.items.map((item, index) => (
                             <div key={index} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-white shadow-sm">
                                <div>
                                  <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                  <p className="text-xs text-slate-500">৳{item.price} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900 text-sm mr-2">৳{item.price * item.quantity}</span>
                                  <button onClick={() => editItem(index)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit2 size={16} /></button>
                                  <button onClick={() => deleteItem(index)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                </div>
                             </div>
                           ))
                         )}
                       </div>
                       
                       <div className="mt-8 pt-6 border-t border-slate-200">
                         <button onClick={submitNewOrder} disabled={newOrderForm.isSubmitting || newOrderForm.items.length === 0} className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-md transition-all flex items-center justify-center gap-2">
                           <Save size={18} />
                           Save Order
                         </button>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MANAGE PRODUCTS VIEW */}
              {activeTab === 'manage_products' && (
                <div className="h-full overflow-y-auto px-2 pb-8 custom-scrollbar">
                  <div className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Add/Edit Product Form Toggle */}
                    {!productForm.showForm ? (
                      <button 
                        onClick={() => setProductForm(p => ({...p, showForm: true, id: ''}))}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mb-6"
                      >
                        <PlusCircle size={20} />
                        Add New Store Product
                      </button>
                    ) : (
                      <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md mb-6 relative animate-in fade-in slide-in-from-top-4 duration-300">
                        <button 
                          onClick={() => setProductForm(p => ({...p, showForm: false, id: ''}))}
                          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <XCircle size={20} />
                        </button>
                        <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                          {productForm.id ? <Edit2 size={20} className="text-indigo-500" /> : <PlusCircle size={20} className="text-indigo-500" />}
                          {productForm.id ? 'Modify Product' : 'Register New Product'}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Product Name *</label>
                              <input 
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                placeholder="e.g. Premium White Oxford" 
                                value={productForm.name} 
                                onChange={e => setProductForm(p => ({...p, name: e.target.value}))} 
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Offer Price (৳) *</label>
                                <input 
                                  type="number" 
                                  className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                  value={productForm.price || ''} 
                                  onChange={e => setProductForm(p => ({...p, price: Number(e.target.value)}))} 
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reg. Price (৳)</label>
                                <input 
                                  type="number" 
                                  className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                  value={productForm.regularPrice || ''} 
                                  placeholder="1290" 
                                  onChange={e => setProductForm(p => ({...p, regularPrice: Number(e.target.value)}))} 
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Thumbnail Image URL *</label>
                              <input 
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                placeholder="Paste image link here" 
                                value={productForm.image} 
                                onChange={e => setProductForm(p => ({...p, image: e.target.value}))} 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Color Label</label>
                              <input 
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" 
                                placeholder="e.g. Light Blue" 
                                value={productForm.color} 
                                onChange={e => setProductForm(p => ({...p, color: e.target.value}))} 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Priority Level</label>
                              <select 
                                className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                value={productForm.priority}
                                onChange={e => setProductForm(p => ({...p, priority: e.target.value as 'high' | 'medium' | 'normal'}))}
                              >
                                <option value="normal">Normal Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-4">
                            {productForm.image ? (
                              <img src={productForm.image} alt="Preview" className="max-h-60 rounded-xl shadow-md object-contain" />
                            ) : (
                              <div className="text-center text-slate-400">
                                <Package size={48} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Image Preview</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                          <button 
                            onClick={handleSaveProduct}
                            disabled={productForm.isSubmitting}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            {productForm.isSubmitting ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                              <><Save size={18} /> {productForm.id ? 'Update Product' : 'Add Product'}</>
                            )}
                          </button>
                          <button 
                            onClick={() => setProductForm(p => ({...p, showForm: false, id: ''}))}
                            className="px-6 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Product List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.length === 0 ? (
                        <div className="col-span-full py-20 bg-white rounded-2xl border border-slate-200 border-dashed text-center">
                          <Package size={48} className="mx-auto text-slate-200 mb-4" />
                          <p className="text-slate-500 font-bold">No products in catalog</p>
                          <p className="text-xs text-slate-400 mt-1">Start by adding your first shirt</p>
                        </div>
                      ) : (
                        products.map(product => (
                          <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                            <div className="aspect-square bg-slate-100 relative overflow-hidden">
                              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button 
                                  onClick={() => setProductForm({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    regularPrice: product.regularPrice,
                                    image: product.image,
                                    color: product.color || '',
                                    priority: product.priority || 'normal',
                                    isSubmitting: false,
                                    showForm: true
                                  })}
                                  className="p-3 bg-white text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110"
                                >
                                  <Edit2 size={20} />
                                </button>
                                <button 
                                  onClick={() => deleteProduct(product.id)}
                                  className="p-3 bg-white text-rose-600 rounded-full hover:bg-rose-600 hover:text-white transition-all transform hover:scale-110"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-slate-900 truncate flex-1" title={product.name}>{product.name}</h3>
                                {product.priority && product.priority !== 'normal' && (
                                  <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                                    product.priority === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                  }`}>
                                    {product.priority}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-black text-indigo-600">৳{product.price}</span>
                                <span className="text-xs text-slate-400 line-through">৳{product.regularPrice}</span>
                                {product.color && (
                                  <span className="ml-auto text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                    {product.color}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SETTINGS VIEW */}
              {activeTab === 'settings' && (
                <div className="h-full overflow-y-auto px-2 pb-8 custom-scrollbar">
                  <div className="max-w-2xl mx-auto space-y-6">
                    
                    {user?.email === 'mr074770@gmail.com' && (
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                          <Users size={20} className="text-indigo-500" />
                          Admin Roles & Permissions
                        </h2>
                        
                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                           <div className="flex justify-between items-center p-3 border border-indigo-100 bg-indigo-50/50 rounded-lg">
                             <div>
                               <p className="text-sm font-bold text-slate-900">mr074770@gmail.com</p>
                               <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full mt-1 inline-block">Super Admin</span>
                             </div>
                           </div>
                           
                           {admins.map(admin => (
                             <div key={admin.id} className="flex justify-between items-center p-3 border border-slate-100 bg-white shadow-sm rounded-lg">
                               <div>
                                 <p className="text-sm font-bold text-slate-900">{admin.email}</p>
                                 <div className="flex flex-wrap gap-1 mt-1">
                                   {admin.permissions?.map((p: string) => (
                                      <span key={p} className="text-[9px] font-black uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{p.replace('_', ' ')}</span>
                                   ))}
                                 </div>
                               </div>
                               <button 
                                 onClick={() => handleRemoveAdmin(admin.email)}
                                 className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                                 title="Remove Admin"
                               >
                                 <Trash2 size={16} />
                               </button>
                             </div>
                           ))}
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                           <h3 className="text-sm font-bold text-slate-800 mb-4">Add New Admin</h3>
                           <div className="space-y-4">
                             <div>
                               <input 
                                 type="email" 
                                 placeholder="admin@example.com" 
                                 className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" 
                                 value={newAdminEmail} 
                                 onChange={e => setNewAdminEmail(e.target.value)} 
                               />
                             </div>
                             
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Access Permissions</label>
                               <div className="flex flex-wrap gap-2 text-sm">
                                 {['dashboard', 'pipeline', 'table', 'add_order', 'manage_products', 'settings'].map(perm => (
                                   <label key={perm} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100">
                                     <input 
                                       type="checkbox" 
                                       checked={newAdminPermissions.includes(perm)}
                                       onChange={e => {
                                         if (e.target.checked) setNewAdminPermissions([...newAdminPermissions, perm]);
                                         else setNewAdminPermissions(newAdminPermissions.filter(p => p !== perm));
                                       }}
                                       className="accent-indigo-600"
                                     />
                                     <span className="capitalize text-slate-700">{perm.replace('_', ' ')}</span>
                                   </label>
                                 ))}
                               </div>
                             </div>
                             
                             <button 
                               onClick={handleAddAdmin}
                               className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors flex justify-center items-center gap-2"
                             >
                               <PlusCircle size={18} /> Add Admin
                             </button>
                           </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h2 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                         <Search size={20} className="text-slate-500" />
                         Marketing & Tracking
                       </h2>
                       
                       <div className="space-y-6">
                         <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Meta Pixel ID</label>
                           <div className="relative">
                             <input 
                               type="text" 
                               className="w-full border border-slate-200 rounded-lg p-3 pl-10 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm" 
                               placeholder="e.g. 123456789012345" 
                               value={metaPixelId} 
                               onChange={e => {
                                 let val = e.target.value.trim();
                                 // Auto-extract Pixel ID if user pasted the entire script
                                 const initMatch = val.match(/fbq\('init',\s*['"](\d+)['"]\)/);
                                 if (initMatch) {
                                   val = initMatch[1];
                                 } else {
                                   const srcMatch = val.match(/id=(\d+)/);
                                   if (srcMatch && val.includes('<script')) {
                                     val = srcMatch[1];
                                   } else if (val.includes('<script')) {
                                     const numps = val.match(/\b\d{15,16}\b/g);
                                     if (numps && numps.length > 0) val = numps[0];
                                   }
                                 }
                                 setMetaPixelId(val);
                               }} 
                             />
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                 <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                               </svg>
                             </div>
                           </div>
                           <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                             Enter your Meta Pixel ID to enable tracking for PageViews, AddToCart, and Purchases. 
                             This will automatically connect your site to Meta Ads for conversion tracking.
                           </p>
                         </div>

                         <div className="pt-6 border-t border-slate-100 mt-6">
                           <button 
                             onClick={handleSaveSettings}
                             disabled={savingSettings}
                             className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
                           >
                             {savingSettings ? (
                               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             ) : (
                               <><Save size={18} /> Update Trackers</>
                             )}
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* INVENTORY & CUSTOMERS PLACEHOLDERS */}
              {(activeTab === 'inventory' || activeTab === 'customers') && (
                <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-sm">
                      {activeTab === 'inventory' ? <Package size={64} className="mx-auto text-slate-300 mb-6" /> : <Users size={64} className="mx-auto text-slate-300 mb-6" />}
                      <h2 className="text-2xl font-black text-slate-900 mb-2">Module Locked</h2>
                      <p className="text-slate-500 mb-6">The {activeTab} intelligence module requires the Enterprise Advanced tier to access real-time syncing and predictive analytics.</p>
                      <button className="bg-slate-900 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-slate-800 transition-colors">
                         Upgrade Plan
                      </button>
                    </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

    </div>
  );
}


