import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  Layers,
  Tag,
  Warehouse,
  ShoppingBag,
  Users,
  Star,
  Ticket,
  Image,
  BookOpen,
  MessageSquare,
  Settings,
  ChevronLeft,
  Menu,
  Bell,
  ExternalLink,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { Logo } from '../../components/Layout';
import { useShop } from '../../contexts/ShopContext';
import { get, patch, errorMessage } from '../../services/api';
import type { Notification } from '../../types';
import { toast } from 'sonner';
export const adminNav = [
  ['/admin', 'Tổng quan', LayoutDashboard],
  ['/admin/products', 'Sản phẩm', Package],
  ['/admin/categories', 'Danh mục', Layers],
  ['/admin/brands', 'Thương hiệu', Tag],
  ['/admin/inventory', 'Kho hàng', Warehouse],
  ['/admin/orders', 'Đơn hàng', ShoppingBag],
  ['/admin/customers', 'Khách hàng', Users],
  ['/admin/reviews', 'Đánh giá', Star],
  ['/admin/vouchers', 'Mã ưu đãi', Ticket],
  ['/admin/banners', 'Banner', Image],
  ['/admin/articles', 'Bài viết', BookOpen],
  ['/admin/faqs', 'Câu hỏi thường gặp', HelpCircle],
  ['/admin/contacts', 'Hộp thư liên hệ', MessageSquare],
  ['/admin/settings', 'Cấu hình cửa hàng', Settings],
] as const;
export default function AdminLayout() {
  const { user, logout } = useShop();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const location = useLocation();
  const list = useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<Notification[]>('/notifications'),
  });
  const title =
    [...adminNav].reverse().find(([url]) => location.pathname.startsWith(url))?.[1] || 'Quản trị';
  return (
    <div className={`admin-shell ${collapsed ? 'collapsed' : ''} ${mobile ? 'sidebar-open' : ''}`}>
      <aside className="admin-sidebar">
        <Logo />
        <div className="admin-sidebar-label">KHÔNG GIAN QUẢN TRỊ</div>
        <nav>
          {adminNav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              onClick={() => setMobile(false)}
              title={label}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link to="/">
            <ExternalLink size={18} />
            <span>Ghé thăm cửa hàng</span>
          </Link>
          <button onClick={() => setCollapsed(!collapsed)} aria-label="Thu gọn / mở sidebar">
            <ChevronLeft size={18} />
            <span>Thu gọn thanh bên</span>
          </button>
        </div>
      </aside>
      {mobile && <div className="admin-mobile-overlay" onClick={() => setMobile(false)} />}
      <div className="admin-body">
        <header className="admin-topbar">
          <div>
            <button
              className="mobile-only"
              aria-label="Menu quản trị"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={23} />
            </button>
            <span>
              HDbaby <b>/</b> {title}
            </span>
          </div>
          <div className="admin-top-actions">
            <span className="demo-badge">Môi trường demo</span>
            <div className="notification-toggle">
              <button aria-label="Thông báo" onClick={() => setNotifications(!notifications)}>
                <Bell size={20} />
                {list.data?.some((n) => !n.read) && <i />}
              </button>
              {notifications && (
                <div className="admin-notifications">
                  <b>Thông báo</b>
                  {list.data?.length ? (
                    list.data.slice(0, 6).map((n) => (
                      <button
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
                        <strong>{n.title}</strong>
                        <small>{n.content}</small>
                      </button>
                    ))
                  ) : (
                    <p>Chưa có thông báo mới.</p>
                  )}
                </div>
              )}
            </div>
            <span className="admin-avatar">{user?.name.charAt(0)}</span>
            <span className="admin-user">
              <b>{user?.name}</b>
              <small>Quản trị viên</small>
            </span>
            <button aria-label="Đăng xuất" onClick={() => void logout()}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
        <div className="admin-footer">HDbaby Admin · Đồ án tốt nghiệp · Dữ liệu minh họa</div>
      </div>
    </div>
  );
}
