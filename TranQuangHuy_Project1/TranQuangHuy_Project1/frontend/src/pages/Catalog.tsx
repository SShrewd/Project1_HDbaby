import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X, ArrowRight } from 'lucide-react';
import { get } from '../services/api';
import type { Product, Page, Category, Brand } from '../types';
import { PageTitle, Loading, ErrorState, Empty, Pagination } from '../components/UI';
import { ProductCard } from '../components/ProductCard';
import { VoucherList } from '../components/VoucherList';
export default function Catalog({ sale = false }: { sale?: boolean }) {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(false);
  const [term, setTerm] = useState(params.get('q') || '');
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
  });
  const brands = useQuery({
    queryKey: ['brands'],
    queryFn: () => get<Brand[]>('/brands'),
  });
  const query = new URLSearchParams(params);
  if (sale) query.set('sale', 'true');
  query.set('limit', '12');
  const products = useQuery({
    queryKey: ['products', query.toString()],
    queryFn: () => get<Page<Product>>(`/products?${query}`),
  });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  useEffect(() => setTerm(params.get('q') || ''), [params]);
  return (
    <div className="container catalog-page">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <span>{sale ? 'Ưu đãi' : 'Dành cho bé yêu'}</span>
      </div>
      <PageTitle
        title={
          sale
            ? 'Ưu đãi nhỏ, yêu thương lớn'
            : params.get('q')
              ? `Kết quả cho “${params.get('q')}”`
              : 'Chăm chút từng lựa chọn'
        }
        description={
          sale
            ? 'Khám phá sản phẩm ưu đãi và lưu mã phù hợp cho đơn hàng của ba mẹ.'
            : 'Những lựa chọn dinh dưỡng, đồng hành cùng từng cột mốc của bé.'
        }
      />
      {sale && <VoucherList />}
      <div className="catalog-layout">
        <aside className={`filters ${filters ? 'show' : ''}`}>
          <div className="filter-title">
            <h3>Lọc sản phẩm</h3>
            <button
              className="mobile-only"
              aria-label="Đóng bộ lọc"
              onClick={() => setFilters(false)}
            >
              <X size={20} />
            </button>
          </div>
          <fieldset>
            <legend>Danh mục</legend>
            <label>
              <input
                type="radio"
                name="category"
                checked={!params.get('category')}
                onChange={() => set('category', '')}
              />
              Tất cả sản phẩm
            </label>
            {categories.data?.map((c) => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="category"
                  checked={params.get('category') === c.slug}
                  onChange={() => set('category', c.slug)}
                />
                {c.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Thương hiệu</legend>
            <select
              aria-label="Thương hiệu"
              value={params.get('brand') || ''}
              onChange={(e) => set('brand', e.target.value)}
            >
              <option value="">Tất cả thương hiệu</option>
              {brands.data?.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Nhóm tuổi theo nhãn</legend>
            <select
              aria-label="Nhóm tuổi"
              value={params.get('age') || ''}
              onChange={(e) => set('age', e.target.value)}
            >
              <option value="">Tất cả độ tuổi</option>
              {[
                ['0-6', '0–6 tháng'],
                ['6-12', '6–12 tháng'],
                ['12-24', '12–24 tháng'],
                ['24-36', '24–36 tháng'],
                ['36+', 'Trên 36 tháng'],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>Khoảng giá</legend>
            <div className="price-inputs">
              <input
                type="number"
                min="0"
                aria-label="Giá từ"
                placeholder="Từ"
                value={params.get('min') || ''}
                onChange={(e) => set('min', e.target.value)}
              />
              <span>–</span>
              <input
                type="number"
                min="0"
                aria-label="Giá đến"
                placeholder="Đến"
                value={params.get('max') || ''}
                onChange={(e) => set('max', e.target.value)}
              />
            </div>
          </fieldset>
          <fieldset>
            <legend>Tình trạng</legend>
            <label>
              <input
                type="checkbox"
                checked={params.get('stock') === 'true'}
                onChange={(e) => set('stock', e.target.checked ? 'true' : '')}
              />
              Chỉ sản phẩm còn hàng
            </label>
          </fieldset>
          <button
            className="btn secondary full"
            onClick={() => {
              setParams({});
              setTerm('');
            }}
          >
            Xóa bộ lọc
          </button>
          <button className="btn full mobile-only" onClick={() => setFilters(false)}>
            Xem kết quả
            <ArrowRight size={16} />
          </button>
          <p className="fine-print">
            Nhóm tuổi và thông tin sản phẩm là dữ liệu nhãn mô phỏng cho đồ án.
          </p>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <span>
              <b>{products.data?.total || 0}</b> lựa chọn cho bé
            </span>
            <button className="filter-toggle" onClick={() => setFilters(!filters)}>
              <SlidersHorizontal size={17} />
              Bộ lọc
            </button>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={params.get('sort') || 'newest'}
              onChange={(e) => set('sort', e.target.value)}
            >
              <option value="newest">Mới nhất</option>
              <option value="bestsellers">Bán chạy</option>
              <option value="price_asc">Giá thấp đến cao</option>
              <option value="price_desc">Giá cao đến thấp</option>
              <option value="rating">Đánh giá tốt nhất</option>
            </select>
          </div>
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              set('q', term);
            }}
          >
            <Search size={18} />
            <input
              value={term}
              aria-label="Từ khóa tìm kiếm"
              placeholder="Tìm theo tên, thương hiệu hoặc SKU…"
              onChange={(e) => setTerm(e.target.value)}
            />
            <button type="submit">Tìm kiếm</button>
          </form>
          {products.isLoading ? (
            <Loading />
          ) : products.isError ? (
            <ErrorState retry={() => void products.refetch()} />
          ) : products.data?.items.length ? (
            <>
              <div className="product-grid catalog-grid">
                {products.data.items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination
                page={products.data.page}
                pages={products.data.pages}
                onChange={(n) => {
                  set('page', String(n));
                  window.scrollTo({ top: 240, behavior: 'smooth' });
                }}
              />
            </>
          ) : (
            <Empty
              title="Chưa tìm thấy lựa chọn phù hợp"
              description="Thử đổi từ khóa hoặc xóa bộ lọc để khám phá thêm."
            />
          )}
        </div>
      </div>
    </div>
  );
}
