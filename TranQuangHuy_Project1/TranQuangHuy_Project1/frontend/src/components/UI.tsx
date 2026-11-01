import { useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Minus, Plus, PackageOpen, RefreshCw, X } from 'lucide-react';
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      data-reveal
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
export function Loading() {
  return (
    <div className="container skeleton-grid" aria-label="Đang tải" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
export function ErrorState({ retry }: { retry?: () => void }) {
  return (
    <div className="empty">
      <RefreshCw size={40} />
      <h2>Chưa thể tải dữ liệu</h2>
      <p>Kiểm tra kết nối đến máy chủ và thử lại.</p>
      {retry && (
        <button className="btn" onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
export function Empty({
  title = 'Chưa có dữ liệu',
  description = 'Khám phá những lựa chọn dành cho bé nhé.',
  to = '/products',
  label = 'Khám phá sản phẩm',
}: {
  title?: string;
  description?: string;
  to?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <PackageOpen size={42} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link className="btn" to={to}>
        {label}
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
export function PageTitle({
  eyebrow = 'HDBABY • GỬI TRỌN YÊU THƯƠNG',
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="page-title">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Quantity({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label="Giảm số lượng"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={14} />
      </button>
      <span>{value}</span>
      <button
        type="button"
        aria-label="Tăng số lượng"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (n: number) => void;
}) {
  if (pages <= 1) return null;
  const nums = Array.from(
    { length: Math.min(5, pages) },
    (_, i) => Math.min(Math.max(1, page - 2), Math.max(1, pages - 4)) + i,
  );
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      {nums.map((n) => (
        <button className={n === page ? 'active' : ''} key={n} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
      <button disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Sau
      </button>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,textarea,select,a[href],[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', key);
      before?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? 'wide' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="Đóng" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}
export function Image({
  src,
  alt,
  className = '',
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/assets/product-0.webp';
      }}
    />
  );
}
