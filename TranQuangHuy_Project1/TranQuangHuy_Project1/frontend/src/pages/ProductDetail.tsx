import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShoppingBag, Star, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { get, money } from '../services/api';
import type { Product, Page } from '../types';
import { useShop } from '../contexts/ShopContext';
import { Image, Loading, ErrorState, Quantity } from '../components/UI';
import { ProductCard } from '../components/ProductCard';
export default function ProductDetail() {
  const { slug } = useParams();
  const { add, favorite, favorites, setDrawer } = useShop();
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [tab, setTab] = useState('description');
  const [busy, setBusy] = useState(false);
  const product = useQuery({
    queryKey: ['product', slug],
    queryFn: () => get<Product>(`/products/${slug}`),
  });
  useEffect(() => {
    if (product.data) document.title = `${product.data.name} | HDbaby`;
  }, [product.data]);
  const related = useQuery({
    queryKey: ['related', product.data?.category.slug],
    queryFn: () => get<Page<Product>>(`/products?category=${product.data!.category.slug}&limit=4`),
    enabled: !!product.data,
  });
  if (product.isLoading) return <Loading />;
  if (product.isError || !product.data) return <ErrorState retry={() => void product.refetch()} />;
  const p = product.data;
  async function buy() {
    setBusy(true);
    try {
      await add(p, quantity);
      setDrawer(true);
    } catch {
      /* context error */
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container detail-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to={`/products?category=${p.category.slug}`}>{p.category.name}</Link>
        <span>/</span>
        <span>{p.brand.name}</span>
      </div>
      <div className="detail-top">
        <div className="gallery">
          <div className="gallery-main">
            <AnimatePresence mode="wait">
              <motion.div
                key={image}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Image
                  src={p.images[image]?.url || p.images[0]?.url}
                  alt={p.name}
                  loading="eager"
                />
              </motion.div>
            </AnimatePresence>
            <span className="product-tag">Chăm chút cho bé</span>
          </div>
          <div className="gallery-thumbs">
            {p.images.map((im, i) => (
              <button
                key={im.id}
                className={image === i ? 'active' : ''}
                onClick={() => setImage(i)}
                aria-label={`Xem ảnh ${i + 1}`}
              >
                <Image src={im.url} alt={`${p.name} — ảnh ${i + 1}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {p.brand.name} · {p.origin}
          </span>
          <h1>{p.name}</h1>
          <div className="rating">
            <Star size={15} fill="currentColor" />
            <b>{p.rating.toFixed(1)}</b>
            <span>
              ({p.reviews?.length || 0} đánh giá mẫu) · SKU: {p.sku}
            </span>
          </div>
          <div className="detail-price">
            <strong>{money(p.price)}</strong>
            {p.originalPrice && (
              <>
                <del>{money(p.originalPrice)}</del>
                <span>−{Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100)}%</span>
              </>
            )}
          </div>
          <p>{p.description}</p>
          <div className="spec-pills">
            <span>{p.age} tháng</span>
            <span>{p.packaging}</span>
            <span className={p.stock ? 'in-stock' : 'sold-out'}>
              {p.stock ? `Còn ${p.stock} sản phẩm` : 'Tạm hết hàng'}
            </span>
          </div>
          <div className="buy-row">
            <Quantity value={quantity} max={p.stock} onChange={setQuantity} />
            <button className="btn" disabled={!p.stock || busy} onClick={() => void buy()}>
              <ShoppingBag size={18} />
              {busy ? 'Đang thêm…' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              className={`btn secondary square ${favorites.includes(p.id) ? 'is-loved' : ''}`}
              aria-label="Yêu thích sản phẩm"
              onClick={() => void favorite(p)}
            >
              <Heart size={19} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="detail-assurance">
            <span>
              <Truck size={20} />
              Miễn phí giao tiêu chuẩn từ 499.000đ
            </span>
            <span>
              <ShieldCheck size={20} />
              Thông tin minh bạch · hỗ trợ tận tâm
            </span>
          </div>
          <div className="notice">
            <b>Thông tin sản phẩm minh họa</b>
            <p>
              Bao bì, thương hiệu, nhóm tuổi và dữ liệu dinh dưỡng dùng cho đồ án. Không thay thế
              nhãn sản phẩm hoặc tư vấn chuyên môn.
            </p>
          </div>
        </div>
      </div>
      <div className="detail-tabs">
        <div className="product-tabs">
          {[
            ['description', 'Thông tin sản phẩm'],
            ['ingredients', 'Thành phần & dinh dưỡng'],
            ['usage', 'Hướng dẫn sử dụng'],
            ['reviews', `Đánh giá (${p.reviews?.length || 0})`],
          ].map(([v, l]) => (
            <button key={v} className={tab === v ? 'active' : ''} onClick={() => setTab(v)}>
              {l}
            </button>
          ))}
        </div>
        <motion.div
          className="tab-content"
          key={tab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {tab === 'reviews' ? (
            <>
              <h2>Ba mẹ chia sẻ</h2>
              <p className="muted">
                Tất cả đánh giá dưới đây là dữ liệu mẫu; chỉ tài khoản có đơn hoàn tất được viết
                đánh giá.
              </p>
              {p.reviews?.length ? (
                p.reviews.map((r) => (
                  <div key={r.id} className="review">
                    <span className="avatar">{r.user?.name.charAt(0)}</span>
                    <div>
                      <strong>{r.user?.name}</strong>
                      <span className="review-stars">{'★'.repeat(r.rating)}</span>
                      <p>{r.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p>Chưa có đánh giá. Ba mẹ có thể đánh giá sau khi đơn hàng hoàn tất.</p>
              )}
            </>
          ) : tab === 'ingredients' ? (
            <>
              <h3>Thành phần theo nhãn mô phỏng</h3>
              <p>{p.ingredients}</p>
              <h3>Thông tin dinh dưỡng</h3>
              <p>{p.nutrition}</p>
            </>
          ) : tab === 'usage' ? (
            <>
              <h3>Hướng dẫn sử dụng</h3>
              <p>{p.usage}</p>
              <h3>Bảo quản</h3>
              <p>{p.storage}</p>
              <h3>Lưu ý</h3>
              <p>{p.warning}</p>
            </>
          ) : (
            <>
              <h2>Một lựa chọn được chăm chút</h2>
              <p>{p.description}</p>
              <dl className="spec-list">
                <dt>Thương hiệu</dt>
                <dd>{p.brand.name}</dd>
                <dt>Xuất xứ mô phỏng</dt>
                <dd>{p.origin}</dd>
                <dt>Quy cách</dt>
                <dd>{p.packaging}</dd>
                <dt>Nhóm tuổi trên nhãn demo</dt>
                <dd>{p.age} tháng</dd>
                <dt>Mã sản phẩm</dt>
                <dd>{p.sku}</dd>
              </dl>
            </>
          )}
        </motion.div>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>Thêm lựa chọn cho bé</h2>
          <Link className="text-link" to={`/products?category=${p.category.slug}`}>
            Khám phá thêm
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="product-grid">
          {related.data?.items
            .filter((x) => x.id !== p.id)
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </section>
    </div>
  );
}
