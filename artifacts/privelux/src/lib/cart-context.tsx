import React, { createContext, useContext, useState, useEffect } from "react";
import type { Product } from "@workspace/api-client-react";
import { effectivePrice } from "@/lib/format";

export interface CartItem {
  product: Product;
  quantity: number;
  size?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number, size?: string) => void;
  removeFromCart: (productId: number, size?: string) => void;
  updateQuantity: (productId: number, quantity: number, size?: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/** Two cart items are the same slot if they share productId + size (or both have no size). */
function sameSlot(a: CartItem, productId: number, size?: string) {
  return a.product.id === productId && (a.size ?? "") === (size ?? "");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("privelux-cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("privelux-cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (product: Product, quantity: number, size?: string) => {
    setItems((current) => {
      const stockLimit = product.stock && product.stock > 0 ? product.stock : null;
      const existing = current.find((item) => sameSlot(item, product.id, size));
      const currentQty = existing?.quantity ?? 0;
      const newQty = stockLimit !== null
        ? Math.min(stockLimit, currentQty + quantity)
        : currentQty + quantity;

      if (existing) {
        return current.map((item) =>
          sameSlot(item, product.id, size) ? { ...item, quantity: newQty } : item
        );
      }
      return [...current, { product, quantity: newQty, size }];
    });
  };

  const removeFromCart = (productId: number, size?: string) => {
    setItems((current) => current.filter((item) => !sameSlot(item, productId, size)));
  };

  const updateQuantity = (productId: number, quantity: number, size?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, size);
      return;
    }
    setItems((current) =>
      current.map((item) =>
        sameSlot(item, productId, size) ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce(
    (sum, item) => sum + effectivePrice(item.product) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
