import { useState, type FormEvent } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserRound,
  MapPin,
  Package,
  Heart,
  LockKeyhole,
  LogOut,
  Bell,
  ArrowRight,
  Plus,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShop } from '../contexts/ShopContext';
import { get, patch, post, remove, errorMessage, queryClient, date, money } from '../services/api';
import type { Address, Page, Order, Product, Notification, Review } from '../types';
import { statusNames } from '../types';
import { PageTitle, Modal, Empty, Loading, ErrorState, Pagination } from '../components/UI';
import { ProductCard } from '../components/ProductCard';
export function AccountLayout() {
  const { user, logout } = useShop();
  const nav = [
    ['/account', 'Hồ sơ của ba mẹ', UserRound],
    ['/account/orders', 'Đơn hàng của tôi', Package],
    ['/account/addresses', 'Sổ địa chỉ', MapPin],
    ['/wishlist', 'Sản phẩm yêu thích', Heart],
    ['/account/reviews', 'Đánh giá của tôi', Star],
    ['/account/notifications', 'Thông báo', Bell],
    ['/account/password', 'Đổi mật khẩu', LockKeyhole],
  ] as const;
  return (
    <div className="container account-page">
      <PageTitle
        title={`Chào ${user?.name.split(' ').at(-1)}, thật vui khi gặp lại!`}
        description="Một góc nhỏ để ba mẹ quản lý hành trình mua sắm của mình."
      />
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-avatar">
            <span>{user?.name.charAt(0)}</span>
            <div>
              <b>{user?.name}</b>
              <small>{user?.email}</small>
            </div>
          </div>
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} end={to === '/account'} to={to}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          {user?.role === 'ADMIN' && (
            <Link to="/admin">
              <Package size={18} />
              Trang quản trị
            </Link>
          )}
          <button onClick={() => void logout()}>
            <LogOut size={18} />
            Đăng xuất
          </button>
        </aside>
        <section className="account-content panel">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
export function Profile() {
  const { user } = useShop();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await patch('/auth/profile', data);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Đã lưu hồ sơ');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Hồ sơ của ba mẹ</h2>
      <p className="muted">Thông tin để chúng mình đồng hành và hỗ trợ tốt hơn.</p>
      <form className="form-stack narrow-form" onSubmit={submit}>
        <label>
          Họ và tên
          <input name="name" required minLength={2} defaultValue={user?.name} />
        </label>
        <label>
          Email
          <input type="email" disabled value={user?.email || ''} />
        </label>
        <label>
          Số điện thoại
          <input name="phone" required pattern="([+]84|0)[0-9]{9,10}" defaultValue={user?.phone} />
        </label>
        <button className="btn" disabled={busy}>
          Lưu thay đổi
          <CheckIcon />
        </button>
      </form>
    </>
  );
}
export function Password() {
  const { logout } = useShop();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusy(true);
    try {
      await patch('/auth/change-password', data);
      toast.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
      await logout();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h2>Đổi mật khẩu</h2>
      <p className="muted">
        Mật khẩu có ít nhất 10 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
      </p>
      <form className="form-stack narrow-form" onSubmit={submit}>
        <label>
          Mật khẩu hiện tại
          <input type="password" name="currentPassword" required autoComplete="current-password" />
        </label>
        <label>
          Mật khẩu mới
          <input
            type="password"
            name="password"
            minLength={10}
            required
            autoComplete="new-password"
          />
        </label>
        <button className="btn" disabled={busy}>
          Đổi mật khẩu
          <LockKeyhole size={17} />
        </button>
      </form>
    </>
  );
}
export function Addresses() {
  const [editing, setEditing] = useState<Address | null | undefined>();
  const [deleting, setDeleting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => get<Address[]>('/addresses'),
  });
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      const body = { ...data, isDefault: data.isDefault === 'on' };
      if (editing) await patch(`/addresses/${editing.id}`, body);
      else await post('/addresses', body);
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Đã lưu địa chỉ');
      setEditing(undefined);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-head small">
        <h2>Sổ địa chỉ</h2>
        <button className="btn small" onClick={() => setEditing(null)}>
          <Plus size={16} />
          Thêm địa chỉ
        </button>
      </div>
      {addresses.isLoading ? (
        <Loading />
      ) : addresses.isError ? (
        <ErrorState retry={() => void addresses.refetch()} />
      ) : addresses.data?.length ? (
        <div className="address-grid">
          {addresses.data.map((a) => (
            <div className="address-card" key={a.id}>
              <h3>
                {a.name}
                {a.isDefault && <span className="badge">Mặc định</span>}
              </h3>
              <p>{a.phone}</p>
              <p>
                {a.detail}, {a.district}, {a.city}
              </p>
              <div className="button-row">
                <button onClick={() => setEditing(a)}>
                  <Pencil size={15} />
                  Chỉnh sửa
                </button>
                <button onClick={() => setDeleting(a.id)}>
                  <Trash2 size={15} />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          title="Thêm địa chỉ đầu tiên"
          description="Lưu địa chỉ để lần sau mua sắm thuận tiện hơn."
          to="/products"
        />
      )}
      {editing !== undefined && (
        <Modal
          title={editing ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
          onClose={() => setEditing(undefined)}
        >
          <form className="form-stack" onSubmit={submit}>
            {[
              ['name', 'Họ tên người nhận'],
              ['phone', 'Số điện thoại'],
              ['city', 'Tỉnh / thành phố'],
              ['district', 'Quận / huyện'],
              ['detail', 'Địa chỉ chi tiết'],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  required
                  minLength={key === 'detail' ? 5 : 2}
                  pattern={key === 'phone' ? '([+]84|0)[0-9]{9,10}' : undefined}
                  defaultValue={(editing?.[key as keyof Address] as string) || ''}
                />
              </label>
            ))}
            <label className="checkbox-label">
              <input type="checkbox" name="isDefault" defaultChecked={editing?.isDefault} />
              Đặt làm địa chỉ mặc định
            </label>
            <button className="btn" disabled={busy}>
              Lưu địa chỉ
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Xóa địa chỉ này?" onClose={() => setDeleting(null)}>
          <p>Địa chỉ sẽ được gỡ khỏi sổ địa chỉ của ba mẹ.</p>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await remove(`/addresses/${deleting}`);
                await addresses.refetch();
                setDeleting(null);
                toast.success('Đã xóa địa chỉ');
              } catch (e) {
                toast.error(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Xác nhận xóa
          </button>
        </Modal>
      )}
    </>
  );
}
export function Orders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const orders = useQuery({
    queryKey: ['orders', page, status],
    queryFn: () => get<Page<Order>>(`/orders/my?page=${page}&status=${status}`),
  });
  return (
    <>
      <div className="section-head small">
        <h2>Đơn hàng của tôi</h2>
        <select
          aria-label="Trạng thái đơn hàng"
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
      </div>
      {orders.isLoading ? (
        <Loading />
      ) : orders.isError ? (
        <ErrorState retry={() => void orders.refetch()} />
      ) : orders.data?.items.length ? (
        <>
          <div className="order-list">
            {orders.data.items.map((o) => (
              <Link className="order-list-card" key={o.id} to={`/account/orders/${o.id}`}>
                <div>
                  <b>{o.code}</b>
                  <span className={`status status-${o.status}`}>{statusNames[o.status]}</span>
                </div>
                <p>{o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
                <div>
                  <small>{date(o.createdAt)}</small>
                  <strong>
                    {money(o.total)}
                    <ArrowRight size={16} />
                  </strong>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} pages={orders.data.pages} onChange={setPage} />
        </>
      ) : (
        <Empty title="Chưa có đơn hàng trong nhóm này" />
      )}
    </>
  );
}
export function Wishlist() {
  const list = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => get<{ product: Product }[]>('/wishlist'),
  });
  return (
    <div className="container wishlist-page">
      <PageTitle
        title="Những điều ba mẹ yêu thích"
        description="Lưu lại một chút yêu thương, sẵn sàng cho lần mua sắm tới."
      />
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState retry={() => void list.refetch()} />
      ) : list.data?.length ? (
        <div className="product-grid">
          {list.data.map((i) => (
            <ProductCard key={i.product.id} product={i.product} />
          ))}
        </div>
      ) : (
        <Empty title="Danh sách yêu thích đang chờ ba mẹ" />
      )}
    </div>
  );
}
export function Notifications() {
  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<Notification[]>('/notifications'),
  });
  return (
    <>
      <h2>Thông báo</h2>
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState retry={() => void list.refetch()} />
      ) : list.data?.length ? (
        list.data.map((n) => (
          <button
            className={`notification-card ${n.read ? 'read' : ''}`}
            key={n.id}
            onClick={async () => {
              try {
                await patch(`/notifications/${n.id}`, {});
                await list.refetch();
              } catch (e) {
                toast.error(errorMessage(e));
              }
            }}
          >
            <Bell size={20} />
            <span>
              <b>{n.title}</b>
              <p>{n.content}</p>
              <small>
                {date(n.createdAt)} · {n.read ? 'Đã đọc' : 'Chạm để đánh dấu đã đọc'}
              </small>
            </span>
          </button>
        ))
      ) : (
        <Empty title="Chưa có thông báo" />
      )}
    </>
  );
}
export function MyReviews() {
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => get<Review[]>('/my-reviews'),
  });
  return (
    <>
      <h2>Đánh giá của ba mẹ</h2>
      <p className="muted">Mở đơn đã hoàn tất để viết hoặc chỉnh sửa nhận xét.</p>
      {list.isLoading ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState retry={() => void list.refetch()} />
      ) : list.data?.length ? (
        list.data.map((r) => (
          <div className="review" key={r.id}>
            <span className="avatar">
              <Star size={19} />
            </span>
            <div>
              <b>{r.product?.name}</b>
              <p className="review-stars">
                {'★'.repeat(r.rating)} · {r.visible ? 'Đang hiển thị' : 'Chờ duyệt'}
              </p>
              <p>{r.content}</p>
              <button
                className="text-link"
                onClick={() => navigate(`/account/orders/${r.orderId}`)}
              >
                Chỉnh sửa trong đơn hàng
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty
          title="Chưa có nhận xét"
          description="Ba mẹ có thể đánh giá sau khi đơn hàng hoàn tất."
          to="/account/orders"
          label="Xem đơn hàng"
        />
      )}
    </>
  );
}
function CheckIcon() {
  return <ArrowRight size={16} />;
}
