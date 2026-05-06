import { create } from 'zustand';
import { logEvent } from '../lib/analytics';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  category?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
  voucher: { code: string; value: number } | null;
  applyVoucher: (voucher: { code: string; value: number }) => void;
  removeVoucher: () => void;
}

export const useCart = create<CartStore>((set) => ({
  items: [],
  total: 0,
  voucher: null,
  applyVoucher: (voucher) => set({ voucher }),
  removeVoucher: () => set({ voucher: null }),
  addItem: (item) => {
    // Log the event asynchronously
    logEvent('add_to_cart', `/product/${item.id}`, item.price).catch(console.error);
    
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      const newItems = existing
        ? state.items.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...state.items, { ...item, quantity: 1 }];
      
      return {
        items: newItems,
        total: newItems.reduce((acc, current) => acc + current.price * current.quantity, 0),
      };
    });
  },
  removeItem: (id) => set((state) => {
    const newItems = state.items.filter((i) => i.id !== id);
    return {
      items: newItems,
      total: newItems.reduce((acc, current) => acc + current.price * current.quantity, 0),
    };
  }),
  clearCart: () => set({ items: [], total: 0, voucher: null }),
}));
