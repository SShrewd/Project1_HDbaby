import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Star, Eye, Check } from 'lucide-react';
import type { Product } from '../types';
import { money } from '../services/api';
import { useShop } from '../contexts/ShopContext';
import { Image, Modal } from './UI';
export function ProductCard({ product: p }: { product: Product }) {
  const { add, favorite, favorites } = useShop();
  const [quick, setQuick] = useState(false);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const discount = p.originalPrice
    ? Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100)
    : 0;
  async function buy() {
    setBusy(true);
    try {
      await add(p);
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch {
      /* toast handled by context */
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <article className="product-card">
        <div className="product-visual">
          <Link to={`/products/${p.slug}`}>
            <Image src={p.images[0]?.url} alt={p.name} />
          </Link>
          <span className={`product-tag ${discount ? 'sale-tag' : ''}`}>
            {discount ? `−${discount}%` : p.featured ? 'Được yêu thích' : 'Lựa chọn cho bé'}
          </span>
          <div className="card-tools">
            <button
              aria-label={`Yêu thích ${p.name}`}
              className={favorites.includes(p.id) ? 'is-loved' : ''}
              onClick={() => void favorite(p)}
            >
              <Heart size={17} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} />
            </button>
            <button aria-label={`Xem nhanh ${p.name}`} onClick={() => setQuick(true)}>
              <Eye size={17} />
            </button>
          </div>
        </div>
        <div className="product-info">
          <div className="product-meta">
            <span>{p.brand.name}</span>
            <span>{p.age} tháng</span>
          </div>
          <Link className="product-name" to={`/products/${p.slug}`}>
            {p.name}
          </Link>
          <div className="rating">
            <Star size={12} fill="currentColor" />
            <b>{p.rating ? p.rating.toFixed(1) : 'Mới'}</b>
            <span>· {p.sold} đã bán mẫu</span>
          </div>
          <div className="price-row">
            <div>
              <strong>{money(p.price)}</strong>
              {p.originalPrice && <del>{money(p.originalPrice)}</del>}
            </div>
            <button
              className={`add-btn ${added ? 'added' : ''}`}
              disabled={!p.stock || busy}
              onClick={() => void buy()}
              aria-label={`Thêm ${p.name} vào giỏ`}
            >
              {added ? <Check size={18} /> : <Plus size={20} />}
            </button>
          </div>
          <span className={`stock ${p.stock ? '' : 'sold-out'}`}>
            {p.stock ? '● Còn hàng' : '● Tạm hết hàng'}
          </span>
        </div>
      </article>
      {quick && (
        <Modal title="Một lựa chọn cho bé" onClose={() => setQuick(false)}>
          <div className="quick-product">
            <Image src={p.images[0]?.url} alt={p.name} />
            <span className="eyebrow">{p.brand.name}</span>
            <h2>{p.name}</h2>
            <strong className="large-price">{money(p.price)}</strong>
            <p>{p.description}</p>
            <div className="button-row">
              <button className="btn" disabled={!p.stock || busy} onClick={() => void buy()}>
                Thêm vào giỏ
              </button>
              <Link
                className="btn secondary"
                to={`/products/${p.slug}`}
                onClick={() => setQuick(false)}
              >
                Xem chi tiết
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
