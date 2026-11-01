import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowRight, ArrowUpDown, Warehouse, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, patch, date, money, errorMessage, queryClient } from '../../services/api';
import type { Page, Product, Order, Address, User } from '../../types';
import { statusNames } from '../../types';
import { Loading, ErrorState, Pagination, Modal, Image } from '../../components/UI';
import { FieldInput } from './ResourcePage';
interface Log {
  id: number;
  productId: number;
  change: number;
  reason: string;
  actor: string;
  createdAt: string;
  product: { name: string; stock: number; sku: string };
}
export function Inventory() {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('products');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [low, setLow] = useState(false);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const products = useQuery({
    queryKey: ['inventory-products', page, q, low],
    queryFn: () =>
      get<Page<Product>>(`/admin/products?page=${page}&q=${encodeURIComponent(q)}&low=${low}`),
    enabled: tab === 'products',
  });
  const logs = useQuery({
    queryKey: ['inventory-logs', page],
    queryFn: () => get<Page<Log>>(`/admin/inventory?page=${page}`),
    enabled: tab === 'logs',
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await post('/admin/inventory', {
        productId: adjust!.id,
        change: Number(data.change),
        reason: data.reason,
      });
      await queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory-logs'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Đã điều chỉnh và ghi lịch sử kho');
      setAdjust(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">KIỂM SOÁT SỐ LƯỢNG</span>
          <h1>Kho hàng</h1>
          <p>Mỗi thay đổi đều được ghi nhận, tồn kho được bảo vệ trong transaction.</p>
        </div>
        <span className="admin-info-pill">
          <Warehouse size={18} />
          Lịch sử kho minh bạch
        </span>
      </div>
      <div className="product-tabs">
        {[
          ['products', 'Tồn kho sản phẩm'],
          ['logs', 'Lịch sử thay đổi'],
        ].map(([v, l]) => (
          <button
            className={tab === v ? 'active' : ''}
            key={v}
            onClick={() => {
              setTab(v);
              setPage(1);
            }}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="panel admin-table-panel">
        {tab === 'products' ? (
          <>
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
                  aria-label="Tìm tồn kho"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Tên sản phẩm hoặc SKU"
                />
              </div>
              <button className="btn secondary small">Tìm kiếm</button>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={low}
                  onChange={(e) => {
                    setLow(e.target.checked);
                    setPage(1);
                  }}
                />
                <AlertTriangle size={15} />
                Chỉ tồn thấp / hết hàng
              </label>
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
                        <th>Hiện có</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.data?.items.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div className="table-product">
                              <Image src={p.images[0]?.url} alt="" />
                              <b>{p.name}</b>
                            </div>
                          </td>
                          <td>{p.sku}</td>
                          <td>
                            <b>{p.stock}</b>
                          </td>
                          <td>
                            <span className={`stock-badge ${p.stock <= 10 ? 'low' : ''}`}>
                              {p.stock === 0 ? 'Hết hàng' : p.stock <= 10 ? 'Tồn thấp' : 'Sẵn sàng'}
                            </span>
                          </td>
                          <td>
                            <button className="text-link" onClick={() => setAdjust(p)}>
                              <ArrowUpDown size={16} />
                              Điều chỉnh
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} pages={products.data?.pages || 0} onChange={setPage} />
              </>
            )}
          </>
        ) : logs.isLoading ? (
          <Loading />
        ) : logs.isError ? (
          <ErrorState retry={() => void logs.refetch()} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Sản phẩm</th>
                    <th>Thay đổi</th>
                    <th>Lý do</th>
                    <th>Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data?.items.map((log) => (
                    <tr key={log.id}>
                      <td>{date(log.createdAt)}</td>
                      <td>{log.product.name}</td>
                      <td>
                        <b className={log.change > 0 ? 'text-green' : 'text-coral'}>
                          {log.change > 0 ? '+' : ''}
                          {log.change}
                        </b>
                      </td>
                      <td>{log.reason}</td>
                      <td>{log.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pages={logs.data?.pages || 0} onChange={setPage} />
          </>
        )}
      </div>
      {adjust && (
        <Modal title="Điều chỉnh tồn kho" onClose={() => setAdjust(null)}>
          <p>{adjust.name}</p>
          <p>
            Hiện có: <b>{adjust.stock}</b>. Nhập số dương để nhập kho, số âm để xuất điều chỉnh.
          </p>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Số lượng thay đổi
              <input
                name="change"
                type="number"
                required
                min={-adjust.stock}
                max={1000000}
                step={1}
              />
            </label>
            <label>
              Lý do điều chỉnh
              <textarea name="reason" required minLength={5} maxLength={255} />
            </label>
            <button className="btn" disabled={busy}>
              Xác nhận điều chỉnh
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
export function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const orders = useQuery({
    queryKey: ['admin-orders', page, status, q],
    queryFn: () =>
      get<Page<Order>>(`/admin/orders?page=${page}&status=${status}&q=${encodeURIComponent(q)}`),
  });
  return (
    <>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">HÀNH TRÌNH ĐƠN HÀNG</span>
          <h1>Đơn hàng</h1>
          <p>Theo dõi từ khi ba mẹ đặt hàng đến khi hoàn tất.</p>
        </div>
        <span className="admin-info-pill">{orders.data?.total || 0} đơn hàng</span>
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
              aria-label="Tìm mã đơn"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Tìm mã đơn hàng…"
            />
          </div>
          <button className="btn secondary small">Tìm kiếm</button>
          <select
            aria-label="Lọc trạng thái đơn quản trị"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusNames).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </form>
        {orders.isLoading ? (
          <Loading />
        ) : orders.isError ? (
          <ErrorState retry={() => void orders.refetch()} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn hàng</th>
                    <th>Khách hàng</th>
                    <th>Ngày đặt</th>
                    <th>Tổng tiền</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data?.items.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <b>{o.code}</b>
                      </td>
                      <td>{o.user?.name}</td>
                      <td>{date(o.createdAt)}</td>
                      <td>{money(o.total)}</td>
                      <td>{o.payment === 'COD' ? 'COD' : 'CK demo'}</td>
                      <td>
                        <span className={`status status-${o.status}`}>{statusNames[o.status]}</span>
                      </td>
                      <td>
                        <Link aria-label={`Xem ${o.code}`} to={`/admin/orders/${o.id}`}>
                          <ArrowRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!orders.data?.items.length && <p className="empty">Chưa có đơn hàng phù hợp.</p>}
            <Pagination page={page} pages={orders.data?.pages || 0} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
export function CustomerDetail() {
  const { id } = useParams();
  const customer = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<User & { addresses: Address[]; orders: Order[] }>(`/admin/customers/${id}`),
  });
  if (customer.isLoading) return <Loading />;
  if (customer.isError || !customer.data)
    return <ErrorState retry={() => void customer.refetch()} />;
  const c = customer.data;
  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link to="/admin/customers" className="text-link">
            ← Danh sách khách hàng
          </Link>
          <h1>{c.name}</h1>
          <p>
            {c.email} · {c.phone}
          </p>
        </div>
        <span className="badge">{c.active ? 'Tài khoản hoạt động' : 'Tài khoản đã khóa'}</span>
      </div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <span>Đơn hàng</span>
          <strong>{c.orders.length}</strong>
        </div>
        <div className="kpi-card">
          <span>Đã mua (đơn hoàn tất)</span>
          <strong>
            {money(
              c.orders
                .filter((o) => o.status === 'COMPLETED')
                .reduce((s, o) => s + Number(o.total), 0),
            )}
          </strong>
        </div>
        <div className="kpi-card">
          <span>Ngày tham gia</span>
          <strong className="small-value">{date(c.createdAt)}</strong>
        </div>
      </div>
      <div className="panel">
        <h2>Lịch sử đơn hàng</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {c.orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link to={`/admin/orders/${o.id}`}>{o.code}</Link>
                  </td>
                  <td>{date(o.createdAt)}</td>
                  <td>{statusNames[o.status]}</td>
                  <td>{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <h2>Địa chỉ đã lưu</h2>
        {c.addresses.map((a) => (
          <p key={a.id}>
            {a.name} · {a.phone} — {a.detail}, {a.district}, {a.city}
          </p>
        ))}
      </div>
    </>
  );
}
export function Settings() {
  const settings = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => get<Record<string, string>>('/admin/settings'),
  });
  const [busy, setBusy] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await patch('/admin/settings', { ...settings.data, ...values });
      await queryClient.invalidateQueries({ queryKey: ['content'] });
      await settings.refetch();
      setValues({});
      toast.success('Thông tin cửa hàng đã cập nhật');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">THÔNG TIN THƯƠNG HIỆU</span>
          <h1>Cấu hình cửa hàng</h1>
          <p>Nội dung được dùng chung ở trang giới thiệu, chính sách, liên hệ và footer.</p>
        </div>
      </div>
      {settings.isLoading ? (
        <Loading />
      ) : settings.isError ? (
        <ErrorState retry={() => void settings.refetch()} />
      ) : (
        <form className="panel form-stack" onSubmit={submit}>
          <div className="form-grid">
            {[
              ['name', 'Tên cửa hàng'],
              ['phone', 'Số điện thoại hỗ trợ'],
              ['email', 'Email liên hệ'],
              ['address', 'Địa chỉ'],
              ['about', 'Câu chuyện thương hiệu'],
              ['shippingPolicy', 'Chính sách giao hàng'],
              ['returnPolicy', 'Chính sách đổi trả'],
              ['privacyPolicy', 'Chính sách bảo mật'],
            ].map(([key, label], i) => (
              <FieldInput
                key={key}
                field={{
                  key,
                  label,
                  required: true,
                  type: i >= 4 ? 'textarea' : 'text',
                }}
                value={values[key] ?? settings.data?.[key]}
                onChange={(value) => setValues((v) => ({ ...v, [key]: value }))}
              />
            ))}
          </div>
          <button className="btn" disabled={busy}>
            <Save size={17} />
            Lưu cấu hình
          </button>
        </form>
      )}
    </>
  );
}
