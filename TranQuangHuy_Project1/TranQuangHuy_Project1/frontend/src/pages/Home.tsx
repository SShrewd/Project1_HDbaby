import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Leaf,
  Check,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { get, money } from '../services/api';
import type { Content, Category, Brand, Page, Product } from '../types';
import { Image, Reveal, Loading, ErrorState } from '../components/UI';
import { ProductCard } from '../components/ProductCard';
import { Benefits } from '../components/Layout';
export default function Home() {
  const content = useQuery({
    queryKey: ['content'],
    queryFn: () => get<Content>('/content'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
  });
  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => get<Brand[]>('/brands'),
  });
  const [tab, setTab] = useState('bestsellers');
  const [age, setAge] = useState('6-12');
  const [slide, setSlide] = useState(0);
  const reduced = useReducedMotion();
  const products = useQuery({
    queryKey: ['home-products', tab],
    queryFn: () =>
      get<Page<Product>>(
        `/products?limit=8&${tab === 'featured' ? 'featured=true' : tab === 'sale' ? 'sale=true' : `sort=${tab}`}`,
      ),
  });
  const ageProducts = useQuery({
    queryKey: ['age-products', age],
    queryFn: () =>
      get<Page<Product>>(`/products?age=${encodeURIComponent(age)}&limit=4&sort=bestsellers`),
  });
  const banners = content.data?.banners || [];
  useEffect(() => {
    if (reduced || banners.length < 2) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % banners.length), 7000);
    return () => clearInterval(timer);
  }, [banners.length, reduced]);
  const banner = banners[slide % banners.length];
  const voucher = content.data?.vouchers[0];
  return (
    <>
      <section className="hero-section">
        <div className="container hero">
          <div className="hero-copy">
            <span className="pill">
              <span />
              NHỎ XINH MỖI BỮA • LỚN KHÔN MỖI NGÀY
            </span>
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h1>
                  {slide === 0 &&
                  (!banner || banner.title === 'Yêu thương từ những điều nhỏ nhất') ? (
                    <>
                      Yêu thương từ
                      <br />
                      những điều{' '}
                      <span>
                        nhỏ nhất.
                        <svg viewBox="0 0 320 18" aria-hidden="true">
                          <path
                            d="M4 12Q155-6 314 8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                    </>
                  ) : (
                    banner?.title
                  )}
                </h1>
                <p>
                  {banner?.subtitle ||
                    'Cùng HDbaby chăm chút từng bữa ăn, đồng hành cùng những cột mốc đầu đời của bé.'}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="hero-ctas">
              <Link className="btn" to={banner?.link || '/products'}>
                Khám phá cho bé
                <ArrowRight size={18} />
              </Link>
              <Link className="text-link" to="/about">
                Câu chuyện HDbaby
                <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="hero-proof">
              <div className="proof-icon">
                <Heart size={21} />
              </div>
              <span>
                <strong>Chăm chút bằng cả tấm lòng</strong>
                <small>Cùng ba mẹ viết nên hành trình lớn khôn</small>
              </span>
            </div>
            <div className="slider-controls">
              <div className="slider-dots">
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    aria-label={`Banner ${i + 1}`}
                    className={i === slide ? 'active' : ''}
                    onClick={() => setSlide(i)}
                  />
                ))}
              </div>
              <span>
                0{slide + 1} <i>/ 0{banners.length || 1}</i>
              </span>
              <button
                aria-label="Banner trước"
                onClick={() => setSlide((s) => (s - 1 + banners.length) % banners.length)}
                disabled={!banners.length}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                aria-label="Banner sau"
                onClick={() => setSlide((s) => (s + 1) % banners.length)}
                disabled={!banners.length}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-photo">
              <Image
                src={banner?.image || '/assets/hero.webp'}
                alt="Mẹ và bé chia sẻ khoảnh khắc vui vẻ bên bữa ăn"
                loading="eager"
              />
            </div>
            <div className="hero-leaf">
              <Leaf size={29} strokeWidth={1.2} />
            </div>
            <span className="hero-sparkle">
              <Sparkles size={31} strokeWidth={1.3} />
            </span>
            <div className="hero-floating-card">
              <span className="floating-heart">
                <Heart fill="currentColor" size={22} />
              </span>
              <div>
                <b>Bé vui khỏe, mẹ an tâm</b>
                <small>Yêu thương trọn vẹn mỗi ngày</small>
              </div>
              <Check size={17} />
            </div>
            <div className="hero-seal">
              <Leaf size={19} />
              <span>
                GỬI TRỌN
                <br />
                <b>yêu thương</b>
              </span>
            </div>
          </div>
        </div>
      </section>
      <Benefits />
      <section className="section container">
        <Reveal>
          <div className="section-head">
            <div>
              <span className="eyebrow">TỪNG ĐIỀU NHỎ, ĐỀU QUAN TRỌNG</span>
              <h2>
                Bé cần gì hôm nay?<span className="tiny-flower">✳</span>
              </h2>
            </div>
            <Link className="text-link" to="/products">
              Tất cả danh mục
              <ArrowRight size={17} />
            </Link>
          </div>
        </Reveal>
        <div className="category-grid">
          {categories.data?.map((c, i) => (
            <Reveal key={c.id}>
              <Link className={`category-card tint-${i % 4}`} to={`/products?category=${c.slug}`}>
                <div>
                  <Image src={c.image} alt={c.name} />
                </div>
                <strong>{c.name}</strong>
                <span>
                  Khám phá
                  <ArrowUpRight size={13} />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section products-section">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <div>
                <span className="eyebrow">NHỮNG LỰA CHỌN ĐƯỢC CHĂM CHÚT</span>
                <h2>Dành điều lành cho bé</h2>
              </div>
              <Link className="text-link" to="/products">
                Mua sắm ngay
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="product-tabs">
              {[
                ['bestsellers', 'Được ba mẹ yêu thích'],
                ['featured', 'Sản phẩm nổi bật'],
                ['newest', 'Mới đến nhà mình'],
                ['sale', 'Ưu đãi nhỏ xinh'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={tab === value ? 'active' : ''}
                  onClick={() => setTab(value)}
                >
                  {label}
                  {value === 'bestsellers' && <Heart size={14} />}
                </button>
              ))}
            </div>
          </Reveal>
          {products.isLoading ? (
            <Loading />
          ) : products.isError ? (
            <ErrorState retry={() => void products.refetch()} />
          ) : (
            <div className="product-grid">
              {products.data?.items.map((p) => (
                <Reveal key={p.id}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
          <div className="section-foot">
            <span>Mỗi lựa chọn, một chút yêu thương.</span>
            <Link className="btn secondary" to="/products">
              Khám phá thêm sản phẩm
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="section container">
        <Reveal className="promo-banner">
          <div className="promo-copy">
            <span className="eyebrow">
              <Sparkles size={15} />
              MÓN QUÀ CHÀO BA MẸ
            </span>
            <h2>
              Khởi đầu hành trình,
              <br />
              nhận thêm yêu thương.
            </h2>
            <p>
              {voucher
                ? `Ưu đãi ${voucher.type === 'PERCENT' ? `${voucher.value}%` : money(voucher.value)} cho đơn từ ${money(voucher.minOrder)}, giảm tối đa ${money(voucher.maxDiscount)}.`
                : 'Khám phá những lựa chọn ưu đãi đang chờ ba mẹ.'}
            </p>
            {voucher && (
              <div className="promo-code">
                {voucher.code}
                <span>MÃ ƯU ĐÃI DEMO</span>
              </div>
            )}
            <Link className="btn" to="/promotions">
              Nhận ưu đãi cho bé
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="promo-image">
            <Image src="/assets/product-7.webp" alt="Combo dinh dưỡng mẫu HDbaby" />
            <span className="promo-sticker">
              một chút
              <br />
              <b>yêu thương</b>
              <Heart size={19} />
            </span>
          </div>
        </Reveal>
      </section>
      <section className="section container age-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">ĐỒNG HÀNH QUA TỪNG CỘT MỐC</span>
            <h2>Lớn khôn theo cách của bé</h2>
            <p>Khám phá sản phẩm theo nhóm tuổi trên nhãn mô phỏng.</p>
          </div>
          <div className="age-tabs">
            {[
              ['0-6', '0–6 tháng'],
              ['6-12', '6–12 tháng'],
              ['12-24', '1–2 tuổi'],
              ['24-36', '2–3 tuổi'],
              ['36+', 'Trên 3 tuổi'],
            ].map(([v, label]) => (
              <button className={age === v ? 'active' : ''} key={v} onClick={() => setAge(v)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {ageProducts.isLoading ? (
          <Loading />
        ) : ageProducts.isError ? (
          <ErrorState retry={() => void ageProducts.refetch()} />
        ) : (
          <div className="product-grid">
            {ageProducts.data?.items.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        )}
      </section>
      <section className="brand-section">
        <div className="container">
          <p>NHỮNG NGƯỜI BẠN TRÊN HÀNH TRÌNH LỚN KHÔN</p>
          <div className="brands">
            {brands.data?.slice(0, 6).map((b) => (
              <Link key={b.id} to={`/products?brand=${b.slug}`}>
                {b.name}
                <span>♥</span>
              </Link>
            ))}
          </div>
          <small>Các thương hiệu và sản phẩm trong website là dữ liệu mô phỏng.</small>
        </div>
      </section>
      <section className="section container">
        <div className="story-section">
          <Reveal className="story-visual">
            <Image src="/assets/hero.webp" alt="Khoảnh khắc ấm áp của mẹ và bé" />
            <span className="story-note">
              Vì tuổi thơ chỉ có một lần.
              <Heart size={17} />
            </span>
          </Reveal>
          <Reveal className="story-copy">
            <span className="eyebrow">CHÀO BA MẸ, CHÚNG MÌNH LÀ HDBABY</span>
            <h2>
              Thấu hiểu điều ba mẹ lo.
              <br />
              Trân trọng điều bé cần.
            </h2>
            <p>
              Hành trình lớn khôn bắt đầu từ những điều rất nhỏ. Một thìa ăn đầu tiên. Một nụ cười
              khi khám phá hương vị mới. Và thật nhiều yêu thương của ba mẹ.
            </p>
            <p>HDbaby ở đây, để cùng ba mẹ chăm chút cho từng khoảnh khắc ấy.</p>
            <div className="story-values">
              <span>
                <ShieldIcon />
                Minh bạch thông tin
              </span>
              <span>
                <Heart size={19} />
                Tận tâm đồng hành
              </span>
            </div>
            <Link to="/about" className="text-link">
              Đọc câu chuyện của chúng mình
              <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>
      <section className="section blog-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">CHIA SẺ ĐỂ HÀNH TRÌNH NHẸ NHÀNG HƠN</span>
              <h2>Một góc nhỏ dành cho ba mẹ</h2>
            </div>
            <Link className="text-link" to="/blog">
              Ghé thăm cẩm nang
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="article-grid">
            {content.data?.articles.map((a) => (
              <Reveal key={a.id}>
                <Link className="article-card" to={`/blog/${a.slug}`}>
                  <div>
                    <Image src={a.image} alt={a.title} />
                    <span>GÓC CHĂM BÉ</span>
                  </div>
                  <small>{new Date(a.createdAt).toLocaleDateString('vi-VN')} · 4 phút đọc</small>
                  <h3>{a.title}</h3>
                  <p>{a.excerpt}</p>
                  <span className="text-link">
                    Đọc cùng HDbaby
                    <ArrowRight size={15} />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="section container testimonials-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">NHỮNG CHIA SẺ NHỎ TỪ BA MẸ</span>
            <h2>Yêu thương được kể lại</h2>
            <p>Đánh giá minh họa từ các đơn hàng đã hoàn tất trong bộ dữ liệu demo.</p>
          </div>
        </div>
        <div className="testimonials-grid">
          {content.data?.testimonials.map((r) => (
            <Reveal key={r.id}>
              <div className="testimonial-card">
                <span className="review-stars">{'★'.repeat(r.rating)}</span>
                <p>“{r.content}”</p>
                <div>
                  <span className="avatar">{r.user.name.charAt(0)}</span>
                  <span>
                    <b>{r.user.name}</b>
                    <small>Đã mua hàng mẫu · Nhận xét demo</small>
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="section container">
        <div className="home-faq">
          <div>
            <span className="eyebrow">CHÚNG MÌNH LUÔN LẮNG NGHE</span>
            <h2>
              Ba mẹ còn
              <br />
              điều băn khoăn?
            </h2>
            <p>Một vài lời giải đáp nhỏ cho hành trình mua sắm thêm an tâm.</p>
            <Link className="text-link" to="/contact">
              Trò chuyện cùng HDbaby
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="accordion">
            {content.data?.faqs.slice(0, 4).map((f) => (
              <details key={f.id}>
                <summary>
                  {f.question}
                  <PlusIcon />
                </summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="demo-ribbon">
        <Star size={15} />
        Website đồ án HDbaby — sản phẩm, giao dịch và đánh giá là dữ liệu minh họa.
      </section>
    </>
  );
}
function ShieldIcon() {
  return <Check size={19} />;
}
function PlusIcon() {
  return <span className="plus-symbol">+</span>;
}
