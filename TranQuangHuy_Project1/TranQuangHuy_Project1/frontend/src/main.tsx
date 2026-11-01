import React, { lazy, Suspense, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { queryClient } from './services/api';
import { ShopProvider, useShop } from './contexts/ShopContext';
import { Layout } from './components/Layout';
import { Loading } from './components/UI';
import './styles.css';
const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Detail = lazy(() => import('./pages/ProductDetail'));
const Auth = lazy(() => import('./pages/Auth'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Success = lazy(() => import('./pages/Checkout').then((m) => ({ default: m.OrderSuccess })));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const AccountLayout = lazy(() =>
  import('./pages/Account').then((m) => ({ default: m.AccountLayout })),
);
const Profile = lazy(() => import('./pages/Account').then((m) => ({ default: m.Profile })));
const Addresses = lazy(() => import('./pages/Account').then((m) => ({ default: m.Addresses })));
const Password = lazy(() => import('./pages/Account').then((m) => ({ default: m.Password })));
const Orders = lazy(() => import('./pages/Account').then((m) => ({ default: m.Orders })));
const Wishlist = lazy(() => import('./pages/Account').then((m) => ({ default: m.Wishlist })));
const Notifications = lazy(() =>
  import('./pages/Account').then((m) => ({ default: m.Notifications })),
);
const Reviews = lazy(() => import('./pages/Account').then((m) => ({ default: m.MyReviews })));
const About = lazy(() => import('./pages/Information').then((m) => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Information').then((m) => ({ default: m.Contact })));
const Blog = lazy(() => import('./pages/Information').then((m) => ({ default: m.Blog })));
const Article = lazy(() =>
  import('./pages/Information').then((m) => ({ default: m.ArticleDetail })),
);
const Faq = lazy(() => import('./pages/Information').then((m) => ({ default: m.FaqPage })));
const Policy = lazy(() => import('./pages/Information').then((m) => ({ default: m.Policy })));
const NotFound = lazy(() => import('./pages/Information').then((m) => ({ default: m.NotFound })));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Resource = lazy(() => import('./pages/admin/ResourcePage'));
const AdminProducts = lazy(() =>
  import('./pages/admin/Products').then((m) => ({ default: m.AdminProducts })),
);
const ProductEditor = lazy(() =>
  import('./pages/admin/Products').then((m) => ({ default: m.ProductEditor })),
);
const Inventory = lazy(() =>
  import('./pages/admin/Operations').then((m) => ({ default: m.Inventory })),
);
const AdminOrders = lazy(() =>
  import('./pages/admin/Operations').then((m) => ({ default: m.AdminOrders })),
);
const CustomerDetail = lazy(() =>
  import('./pages/admin/Operations').then((m) => ({
    default: m.CustomerDetail,
  })),
);
const Settings = lazy(() =>
  import('./pages/admin/Operations').then((m) => ({ default: m.Settings })),
);
function Protected({ admin = false }: { admin?: boolean }) {
  const { user, authLoading } = useShop();
  const location = useLocation();
  if (authLoading) return <Loading />;
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/account" replace />;
  return <Outlet />;
}
function Metadata() {
  const location = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Yêu thương từ những điều nhỏ nhất',
      '/products': 'Chăm chút từng lựa chọn',
      '/about': 'Câu chuyện của chúng mình',
      '/blog': 'Góc của ba mẹ',
      '/cart': 'Giỏ hàng',
      '/login': 'Đăng nhập',
      '/register': 'Đăng ký',
      '/contact': 'Liên hệ',
      '/promotions': 'Ưu đãi nhỏ xinh',
    };
    document.title = `${titles[location.pathname] || (location.pathname.startsWith('/admin') ? 'Quản trị cửa hàng' : 'Đồng hành cùng ba mẹ')} | HDbaby`;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <ShopProvider>
            <Metadata />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="products" element={<Catalog />} />
                  <Route path="products/:slug" element={<Detail />} />
                  <Route path="promotions" element={<Catalog sale />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="blog" element={<Blog />} />
                  <Route path="blog/:slug" element={<Article />} />
                  <Route path="faq" element={<Faq />} />
                  <Route path="policies/:type" element={<Policy />} />
                  <Route path="cart" element={<Cart />} />
                  <Route path="login" element={<Auth />} />
                  <Route path="register" element={<Auth mode="register" />} />
                  <Route path="forgot-password" element={<Auth mode="forgot" />} />
                  <Route path="reset-password" element={<Auth mode="reset" />} />
                  <Route element={<Protected />}>
                    <Route path="checkout" element={<Checkout />} />
                    <Route path="order-success/:id" element={<Success />} />
                    <Route path="wishlist" element={<Wishlist />} />
                    <Route path="account/orders/:id" element={<OrderDetail />} />
                    <Route path="account" element={<AccountLayout />}>
                      <Route index element={<Profile />} />
                      <Route path="addresses" element={<Addresses />} />
                      <Route path="password" element={<Password />} />
                      <Route path="orders" element={<Orders />} />
                      <Route path="notifications" element={<Notifications />} />
                      <Route path="reviews" element={<Reviews />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
                <Route element={<Protected admin />}>
                  <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="products" element={<AdminProducts />} />
                    <Route path="products/new" element={<ProductEditor />} />
                    <Route path="products/:id/edit" element={<ProductEditor />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="orders/:id" element={<OrderDetail admin />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path=":resource" element={<Resource />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
            <Toaster richColors position="bottom-right" closeButton />
          </ShopProvider>
        </MotionConfig>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
