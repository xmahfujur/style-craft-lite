export interface Product {
  id: string;
  name: string;
  color: string;
  price: number;
  regularPrice: number;
  image: string;
  stock?: number;
  priority?: 'high' | 'medium' | 'normal';
}

export type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  customerName: string;
  address: string;
  phoneNumber: string;
  items: OrderItem[];
  size: Size;
  shippingLocation: 'inside_dhaka' | 'outside_dhaka';
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: any; // Firestore Timestamp
}

export interface AppSettings {
  metaPixelId?: string;
}
