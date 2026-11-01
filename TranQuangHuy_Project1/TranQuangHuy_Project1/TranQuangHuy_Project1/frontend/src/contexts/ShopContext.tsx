import { createContext, useContext, useState, type ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { get, post, patch, remove, errorMessage, queryClient } from '../services/api';
import type { User, CartItem, Product } from '../types';
interface Shop {
  user: User | null | undefined;
  authLoading: boolean;
  cart: CartItem[];
  cartLoading: boolean;
  drawer: boolean;
  setDrawer: (v: boolean) => void;
  add: (p: Product, qty?: number) => Promise<void>;
  update: (id: number, values: { quantity?: number; selected?: boolean }) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
  favorite: (p: Product) => Promise<void>;
  favorites: number[];
}
const Context = createContext<Shop | null>(null);
export function ShopProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const auth = useQuery({
    queryKey: ['me'],
    queryFn: () => get<User>('/auth/me').catch(() => null),
    retry: false,
    staleTime: 60000,
  });
  const [guest, setGuest] = useState<CartItem[]>(() => {
    try {
      const items = JSON.parse(localStorage.getItem('hdbaby-cart') || '[]');
      return Array.isArray(items) ? items.filter((i) => i.product?.id && i.quantity > 0) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem('hdbaby-cart', JSON.stringify(guest)), [guest]);
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: () => get<CartItem[]>('/cart'),
    enabled: !!auth.data,
  });
  const wishlist = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => get<{ product: Product }[]>('/wishlist'),
    enabled: !!auth.data,
  });
  const cart = auth.data ? cartQuery.data || [] : guest;
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  };
  async function login(user: User) {
    queryClient.setQueryData(['me'], user);
    for (const i of guest) {
      try {
        const merged = await post<{ id: number }>('/cart/items', {
          productId: i.productId,
          quantity: i.quantity,
        });
        await patch(`/cart/items/${merged.id}`, { selected: i.selected });
        setGuest((g) => g.filter((x) => x.productId !== i.productId));
      } catch (e) {
        toast.error(`${i.product.name}: ${errorMessage(e)}`);
      }
    }
    await invalidate();
  }
  async function add(product: Product, quantity = 1) {
    try {
      if (auth.data) {
        await post('/cart/items', { productId: product.id, quantity });
        await invalidate();
      } else {
        const old = guest.find((i) => i.productId === product.id);
        if ((old?.quantity || 0) + quantity > product.stock) throw Error('Số lượng vượt tồn kho');
        setGuest((items) =>
          old
            ? items.map((i) =>
                i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i,
              )
            : [
                ...items,
                {
                  id: product.id,
                  productId: product.id,
                  quantity,
                  selected: true,
                  priceAtAdd: product.price,
                  product,
                },
              ],
        );
      }
      toast.success('Đã thêm vào giỏ hàng');
    } catch (e) {
      toast.error(errorMessage(e));
      throw e;
    }
  }
  async function update(id: number, values: { quantity?: number; selected?: boolean }) {
    try {
      if (auth.data) {
        await patch(`/cart/items/${id}`, values);
        await invalidate();
      } else {
        const item = guest.find((i) => i.id === id);
        if (values.quantity && item && values.quantity > item.product.stock)
          throw Error('Số lượng vượt tồn kho');
        setGuest((items) => items.map((i) => (i.id === id ? { ...i, ...values } : i)));
      }
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function deleteItem(id: number) {
    try {
      if (auth.data) {
        await remove(`/cart/items/${id}`);
        await invalidate();
      } else setGuest((items) => items.filter((i) => i.id !== id));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function logout() {
    try {
      await post('/auth/logout');
      queryClient.setQueryData(['me'], null);
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['wishlist'] });
      navigate('/');
      toast.success('Đã đăng xuất');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function favorite(product: Product) {
    if (!auth.data) {
      toast.info('Đăng nhập để lưu sản phẩm yêu thích');
      navigate('/login');
      return;
    }
    try {
      if (wishlist.data?.some((i) => i.product.id === product.id)) {
        await remove(`/wishlist/${product.id}`);
        toast.success('Đã bỏ yêu thích');
      } else {
        await post('/wishlist', { productId: product.id });
        toast.success('Đã lưu vào yêu thích');
      }
      await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <Context.Provider
      value={{
        user: auth.data,
        authLoading: auth.isLoading,
        cart,
        cartLoading: cartQuery.isLoading,
        drawer,
        setDrawer,
        add,
        update,
        deleteItem,
        login,
        logout,
        favorite,
        favorites: wishlist.data?.map((i) => i.product.id) || [],
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useShop() {
  const context = useContext(Context);
  if (!context) throw Error('Shop context missing');
  return context;
}
