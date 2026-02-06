import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';

interface CartItem {
  product_id: number;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  stock: number;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const existing = items.find(i => i.product_id === item.product_id);
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, item.stock);
      if (newQty === existing.quantity) {
        toast.info(`"${item.name}" já está no limite de estoque`);
      } else {
        toast.success(`"${item.name}" — quantidade atualizada para ${newQty}`);
      }
      setItems(prev => prev.map(i =>
        i.product_id === item.product_id ? { ...i, quantity: newQty } : i
      ));
    } else {
      toast.success(`"${item.name}" adicionado ao carrinho`);
      setItems(prev => [...prev, { ...item, quantity: Math.min(quantity, item.stock) }]);
    }
  }, [items]);

  const removeItem = useCallback((productId: number) => {
    const item = items.find(i => i.product_id === productId);
    if (item) toast(`"${item.name}" removido do carrinho`);
    setItems(prev => prev.filter(i => i.product_id !== productId));
  }, [items]);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity <= 0) {
      const item = items.find(i => i.product_id === productId);
      if (item) toast(`"${item.name}" removido do carrinho`);
      setItems(prev => prev.filter(i => i.product_id !== productId));
      return;
    }
    setItems(prev => prev.map(i =>
      i.product_id === productId ? { ...i, quantity: Math.min(quantity, i.stock) } : i
    ));
  }, [items]);

  const clearCart = useCallback(() => {
    if (items.length > 0) toast('Carrinho esvaziado');
    setItems([]);
  }, [items]);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de CartProvider');
  return ctx;
}
