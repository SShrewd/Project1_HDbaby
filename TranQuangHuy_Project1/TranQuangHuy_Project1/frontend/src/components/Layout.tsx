import { useEffect, useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Heart,
  UserRound,
  Menu,
  X,
  ArrowRight,
  Truck,
  ShieldCheck,
  Headphones,
  ChevronDown,
  Trash2,
  Phone,
  Instagram,
  Leaf,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShop } from '../contexts/ShopContext';
import { get, post, money, errorMessage } from '../services/api';
import type { Category, Page, Product, Content } from '../types';
import { Image, Quantity, Empty } from './UI';
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="HDbaby — Trang chủ">
      <span className="logo-mark">
        <Heart size={19} fill="currentColor" />
        <i />
      </span>
      <span>
        HD<span>baby</span>
        <small>CHĂM CHÚT TỪ YÊU THƯƠNG</small>
      </span>
    </Link>
  );
}
const navigation = [
  ['/', 'Trang chủ'],
  ['/about', 'Về HDbaby'],
  ['/products', 'Sản phẩm'],
  ['/promotions', 'Ưu đãi'],
  ['/blog', 'Góc của ba mẹ'],
  ['/contact', 'Liên hệ'],
];
export function Layout() {
  const { user, cart, drawer, setDrawer } = useShop();
  const [menu, setMenu] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
  });
  const content = useQuery({
    queryKey: ['content'],
    queryFn: () => get<Content>('/content'),
  });
  const results = useQuery({
    queryKey: ['suggestions', debounced],
    queryFn: () => get<Page<Product>>(`/products/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
  });
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    setMenu(false);
    setCategoriesOpen(false);
    setFocused(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const listener = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', listener);
    return () => window.removeEventListener('scroll', listener);
  }, []);
  function submit(e: FormEvent) {
    e.preventDefault();
    setFocused(false);
    navigate(`/products?q=${encodeURIComponent(search)}`);
  }
  return (
    <>
      <div className="announcement">
        <Leaf size={13} />
        <span>Một khởi đầu lành. Một hành trình đầy yêu thương.</span>
        <span className="announcement-right">
          Miễn phí giao hàng từ 499.000đ <ArrowRight size={13} />
        </span>
      </div>
      <header className={scrolled ? 'scrolled' : ''}>
        <div className="header-main container">
          <button
            className="mobile-menu icon-button"
            aria-label="Mở menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <Logo />
          <div className="search-wrapper">
            <form className="search-form" onSubmit={submit}>
              <Search size={18} />
              <input
                aria-label="Tìm kiếm sản phẩm"
                placeholder="Ba mẹ đang tìm gì cho bé?"
                value={search}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 200)}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌕</kbd>
            </form>
            {focused && debounced.length >= 2 && (
              <div className="search-results">
                {results.data?.items.length ? (
                  results.data.items.map((p) => (
                    <Link to={`/products/${p.slug}`} key={p.id} onClick={() => setFocused(false)}>
                      <Image src={p.images[0]?.url} alt="" />
                      <span>
                        {p.name}
                        <b>{money(p.price)}</b>
                      </span>
                    </Link>
                  ))
                ) : (
                  <p>Chưa tìm thấy sản phẩm phù hợp.</p>
                )}
                <Link className="search-all" to={`/products?q=${encodeURIComponent(search)}`}>
                  Xem tất cả kết quả <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
          <div className="header-actions">
            <Link className="account-link" to={user ? '/account' : '/login'}>
              <UserRound size={23} />
              <span>
                <small>Xin chào ba mẹ</small>
                <b>{user ? user.name.split(' ').at(-1) : 'Tài khoản'}</b>
              </span>
            </Link>
            <Link className="icon-button wishlist-link" to="/wishlist" aria-label="Yêu thích">
              <Heart size={23} />
            </Link>
            <button
              className="icon-button cart-toggle"
              aria-label="Mở giỏ hàng"
              onClick={() => setDrawer(true)}
            >
              <ShoppingBag size={23} />
              <span>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
            </button>
          </div>
        </div>
        <div className={`nav-wrap ${menu ? 'mobile-open' : ''}`}>
          <nav className="container main-nav">
            <div className="category-nav">
              <button onClick={() => setCategoriesOpen(!categoriesOpen)}>
                <Menu size={17} />
                Danh mục sản phẩm
                <ChevronDown size={14} />
              </button>
              <AnimatePresence>
                {categoriesOpen && (
                  <motion.div
                    className="category-dropdown"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {categories.data?.map((c) => (
                      <Link
                        key={c.id}
                        to={`/products?category=${c.slug}`}
                        onClick={() => setCategoriesOpen(false)}
                      >
                        <Image src={c.image} alt="" />
                        {c.name}
                        <ArrowRight size={14} />
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="nav-links">
              {navigation.map(([to, label]) => (
                <NavLink key={to} to={to} end={to === '/'}>
                  {label}
                  {to === '/promotions' && <span className="nav-dot" />}
                </NavLink>
              ))}
            </div>
            <Link className="nav-help" to="/contact">
              <Headphones size={17} />
              Ba mẹ cần hỗ trợ?
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0.5, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Outlet />
        </motion.div>
      </main>
      <section className="newsletter">
        <div className="container newsletter-inner">
          <div className="newsletter-heading">
            <span className="newsletter-icon">
              <Mail size={28} />
            </span>
            <div>
              <h2>Một chút tin vui, gửi đến ba mẹ</h2>
              <p>Nhận cẩm nang mới và ưu đãi nhỏ xinh từ HDbaby.</p>
            </div>
          </div>
          <Newsletter />
        </div>
      </section>
      <footer>
        <div className="container footer-grid">
          <div>
            <Logo />
            <p>
              Chăm chút từng bữa ăn.
              <br />
              Nâng niu từng khoảnh khắc lớn khôn.
            </p>
            <span className="demo-note">Đồ án tốt nghiệp • Toàn bộ dữ liệu là minh họa</span>
            <div className="social-links">
              <Link to="/contact" aria-label="Liên hệ HDbaby">
                <Instagram size={19} />
              </Link>
              <a
                href={`mailto:${content.data?.settings.email || 'hello@hdbaby.local'}`}
                aria-label="Email HDbaby"
              >
                <Mail size={19} />
              </a>
            </div>
          </div>
          <div>
            <h4>Khám phá HDbaby</h4>
            <Link to="/about">Câu chuyện của chúng mình</Link>
            <Link to="/products">Dành cho bé yêu</Link>
            <Link to="/blog">Góc của ba mẹ</Link>
            <Link to="/promotions">Ưu đãi đang chờ</Link>
          </div>
          <div>
            <h4>Ba mẹ cần biết</h4>
            <Link to="/policies/shipping">Chính sách giao hàng</Link>
            <Link to="/policies/returns">Chính sách đổi trả</Link>
            <Link to="/policies/privacy">Bảo mật thông tin</Link>
            <Link to="/faq">Câu hỏi thường gặp</Link>
            <Link to="/account/orders">Theo dõi đơn hàng</Link>
          </div>
          <div>
            <h4>Luôn ở đây cùng ba mẹ</h4>
            <a
              href={`tel:${content.data?.settings.phone?.replace(/\s/g, '') || '19006886'}`}
              className="footer-phone"
            >
              <Phone size={18} />
              {content.data?.settings.phone || '1900 6886'}
            </a>
            <p>{content.data?.settings.email}</p>
            <p>{content.data?.settings.address}</p>
            <div className="payment-methods">
              <span>COD</span>
              <span>Chuyển khoản demo</span>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {content.data?.settings.name || 'HDbaby'}. Gửi trọn yêu
            thương.
          </span>
          <span>
            Made with a little love <Heart size={12} />
          </span>
        </div>
      </footer>
      <CartDrawer open={drawer} close={() => setDrawer(false)} />
    </>
  );
}
function Newsletter() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await post('/newsletter', { email });
      toast.success('Đã đăng ký nhận tin. Cảm ơn ba mẹ!');
      setEmail('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="newsletter-form">
      <input
        type="email"
        required
        aria-label="Email nhận tin"
        placeholder="Email của ba mẹ"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" disabled={busy}>
        Đăng ký
        <ArrowRight size={17} />
      </button>
    </form>
  );
}
export function CartDrawer({ open, close }: { open: boolean; close: () => void }) {
  const { cart, update, deleteItem } = useShop();
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open, close]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-overlay"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="cart-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Giỏ hàng"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25 }}
          >
            <div className="modal-head">
              <h2>
                Giỏ hàng của ba mẹ <small>({cart.length})</small>
              </h2>
              <button onClick={close} aria-label="Đóng giỏ hàng">
                <X />
              </button>
            </div>
            <div className="drawer-items">
              {cart.length ? (
                cart.map((i) => (
                  <div className="drawer-item" key={i.id}>
                    <Image src={i.product.images[0]?.url} alt={i.product.name} />
                    <div>
                      <Link to={`/products/${i.product.slug}`} onClick={close}>
                        {i.product.name}
                      </Link>
                      <strong>{money(i.product.price)}</strong>
                      <Quantity
                        value={i.quantity}
                        max={i.product.stock}
                        onChange={(quantity) => void update(i.id, { quantity })}
                      />
                    </div>
                    <button aria-label="Xóa sản phẩm" onClick={() => void deleteItem(i.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <Empty title="Giỏ hàng đang chờ yêu thương" />
              )}
            </div>
            {cart.length > 0 && (
              <div className="drawer-footer">
                <div>
                  <span>Tạm tính</span>
                  <strong>
                    {money(cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0))}
                  </strong>
                </div>
                <p>Phí vận chuyển và ưu đãi được tính khi thanh toán.</p>
                <Link className="btn full" to="/cart" onClick={close}>
                  Xem giỏ hàng
                  <ArrowRight size={18} />
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
export function Benefits() {
  return (
    <div className="benefits container">
      {[
        [ShieldCheck, 'An tâm từng lựa chọn', 'Thông tin sản phẩm minh bạch'],
        [Truck, 'Giao hàng tận tâm', 'Miễn phí từ 499.000đ'],
        [Heart, 'Chăm chút cho bé', 'Đồng hành cùng ba mẹ'],
        [Headphones, 'Luôn sẵn lòng lắng nghe', 'Hỗ trợ trong suốt hành trình'],
      ].map(([Icon, title, desc]) => {
        const I = Icon as typeof Heart;
        return (
          <div key={String(title)}>
            <I size={27} strokeWidth={1.4} />
            <span>
              <strong>{String(title)}</strong>
              <small>{String(desc)}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
