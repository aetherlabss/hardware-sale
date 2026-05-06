import { create } from 'zustand';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  status?: string;
  image?: string;
  images: string[];
  desc: string;
  tags: string[];
  specs: any;
  createdAt?: any;
}

interface StoreState {
  products: Product[];
  loadingProducts: boolean;
  initProducts: () => void;
}

export const useStore = create<StoreState>((set) => {
  let unsub: (() => void) | null = null;
  return {
    products: [],
    loadingProducts: true,
    initProducts: () => {
      if (unsub) return;
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      unsub = onSnapshot(q, (snapshot) => {
        const prod = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            image: data.images ? data.images[0] : ''
          } as Product;
        });
        set({ products: prod, loadingProducts: false });
      }, (error) => {
        // Fall back silent here, might happen if rules not satisfied or offline fully
        console.error("Store sync error", error);
        set({ loadingProducts: false });
      });
    }
  }
});
