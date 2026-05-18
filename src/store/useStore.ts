import { create } from 'zustand';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subCategory?: string;
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
      const q = collection(db, 'products');
      unsub = onSnapshot(q, (snapshot) => {
        let prod = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            image: data.images ? data.images[0] : ''
          } as Product;
        });
        
        // Sort by creation time manually as we might not have firestore indexes setup
        prod.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        set({ products: prod, loadingProducts: false });
      }, (error) => {
        // Fall back silent here, might happen if rules not satisfied or offline fully
        console.error("Store sync error", error);
        set({ loadingProducts: false });
      });
    }
  }
});
