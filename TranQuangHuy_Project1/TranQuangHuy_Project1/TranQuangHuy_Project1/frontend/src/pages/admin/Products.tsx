import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Pencil, Archive, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, patch, remove, money, errorMessage, queryClient } from '../../services/api';
import type { Product, Page, Category, Brand } from '../../types';
import { Image, Loading, ErrorState, Pagination, Modal } from '../../components/UI';
import { FieldInput, ImageUpload } from './ResourcePage';
import { productFields } from './config';
export function AdminProducts() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('');
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const products = useQuery({
    queryKey: ['admin-products', page, q, sort, category],
    queryFn: () =>
      get<Page<Product>>(
        `/admin/products?page=${page}&q=${encodeURIComponent(q)}&sort=${sort}&category=${category}`,
      ),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories'),
  });
  return (
    <>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">DANH MỤC DINH DƯỠNG</span>
          <h1>Sản phẩm</h1>
          <p>Chăm chút thông tin cho từng lựa chọn của ba mẹ.</p>
        </div>
        <Link className="btn" to="/admin/products/new">
          <Plus size={17} />
          Thêm sản phẩm
        </Link>
      </div>
      <div className="panel admin-table-panel">
        <form
          className="table-toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(term);
            setPage(1);
          }}
        >
          <div className="input-icon">
            <Search size={17} />
            <input
              aria-label="Tìm sản phẩm quản trị"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tên sản phẩm, SKU…"
            />
          </div>
          <button className="btn secondary small">Tìm</button>
          <select
            aria-label="Danh mục quản trị"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categories.data?.map((c) => (
              <option value={c.slug} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sắp xếp quản trị"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng</option>
            <option value="price_desc">Giá giảm</option>
            <option value="bestsellers">Bán chạy</option>
            <option value="rating">Đánh giá</option>
          </select>
          <span>{products.data?.total || 0} sản phẩm</span>
        </form>
        {products.isLoading ? (
          <Loading />
        ) : products.isError ? (
          <ErrorState retry={() => void products.refetch()} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>SKU</th>
                    <th>Danh mục</th>
                    <th>Giá bán</th>
                    <th>Tồn kho</th>
                    <th>Hiển thị</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data?.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="table-product">
                          <Image src={p.images[0]?.url} alt="" />
                          <span>
                            <b>{p.name}</b>
                            <small>{p.brand.name}</small>
                          </span>
                        </div>
                      </td>
                      <td>{p.sku}</td>
                      <td>{p.category.name}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <span className={`stock-badge ${p.stock <= 10 ? 'low' : ''}`}>
                          {p.stock}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.active ? 'positive' : 'muted-badge'}`}>
                          {p.active ? 'Đang bán' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link aria-label={`Sửa ${p.name}`} to={`/admin/products/${p.id}/edit`}>
                            <Pencil size={16} />
                          </Link>
                          <button aria-label={`Ẩn ${p.name}`} onClick={() => setDeleting(p)}>
                            <Archive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!products.data?.items.length && <p className="empty">Chưa có sản phẩm phù hợp.</p>}
            <Pagination page={page} pages={products.data?.pages || 0} onChange={setPage} />
          </>
        )}
      </div>
      {deleting && (
        <Modal title="Ngừng hiển thị sản phẩm?" onClose={() => setDeleting(null)}>
          <p>{deleting.name}</p>
          <p>Lịch sử đơn hàng và tồn kho được giữ nguyên.</p>
          <button
            className="btn danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await remove(`/admin/products/${deleting.id}`);
                await products.refetch();
                setDeleting(null);
                toast.success('Đã ẩn sản phẩm');
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Xác nhận ẩn
          </button>
        </Modal>
      )}
    </>
  );
}
export function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(productFields.map((f) => [f.key, f.default ?? ''])),
  );
  const [images, setImages] = useState<string[]>(['/assets/product-0.webp']);
  const [busy, setBusy] = useState(false);
  const product = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => get<Product>(`/admin/products/${id}`),
    enabled: !!id,
  });
  const categories = useQuery({
    queryKey: ['admin-options-categories'],
    queryFn: () => get<Page<Category>>('/admin/categories?limit=100'),
  });
  const brands = useQuery({
    queryKey: ['admin-options-brands'],
    queryFn: () => get<Page<Brand>>('/admin/brands?limit=100'),
  });
  useEffect(() => {
    if (product.data) {
      setValues({ ...product.data, originalPrice: product.data.originalPrice ?? 0 });
      setImages(product.data.images.map((i) => i.url));
    }
  }, [product.data]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!images.length) {
      toast.error('Sản phẩm cần ít nhất một ảnh');
      return;
    }
    setBusy(true);
    try {
      const body = {
        ...values,
        categoryId: Number(values.categoryId),
        brandId: Number(values.brandId),
        originalPrice: Number(values.originalPrice) || null,
        images,
      };
      if (id) await patch(`/admin/products/${id}`, body);
      else await post('/admin/products', body);
      toast.success('Đã lưu sản phẩm');
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/products');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (id && product.isLoading) return <Loading />;
  if (product.isError) return <ErrorState retry={() => void product.refetch()} />;
  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link className="text-link" to="/admin/products">
            <ArrowLeft size={16} />
            Danh sách sản phẩm
          </Link>
          <h1>{id ? 'Chỉnh sửa sản phẩm' : 'Thêm một lựa chọn mới'}</h1>
          <p>Thông tin nhãn trong đồ án cần ghi rõ là dữ liệu minh họa.</p>
        </div>
      </div>
      <form className="panel form-stack product-editor" onSubmit={save}>
        <h2>Thông tin sản phẩm</h2>
        <div className="form-grid">
          {productFields.map((f) => {
            const field =
              f.key === 'categoryId'
                ? {
                    ...f,
                    options: categories.data?.items.map((c) => ({
                      value: c.id,
                      label: `${c.name}${c.active ? '' : ' (đã ẩn)'}`,
                    })),
                  }
                : f.key === 'brandId'
                  ? {
                      ...f,
                      options: brands.data?.items.map((b) => ({
                        value: b.id,
                        label: `${b.name}${b.active ? '' : ' (đã ẩn)'}`,
                      })),
                    }
                  : f;
            return (
              <FieldInput
                key={f.key}
                field={field}
                value={values[f.key]}
                disabled={f.key === 'stock' && !!id}
                onChange={(v) => setValues((old) => ({ ...old, [f.key]: v }))}
              />
            );
          })}
        </div>
        {id && (
          <Link className="text-link" to="/admin/inventory">
            <ArrowUpDown size={16} />
            Điều chỉnh số lượng tại Kho hàng
          </Link>
        )}
        <h3>Ảnh sản phẩm & ảnh đại diện</h3>
        <ImageUpload value={images} onChange={setImages} />
        <div className="button-row">
          <Link className="btn secondary" to="/admin/products">
            Hủy chỉnh sửa
          </Link>
          <button className="btn" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu sản phẩm'}
          </button>
        </div>
      </form>
    </>
  );
}
