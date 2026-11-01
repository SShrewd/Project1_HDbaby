import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowUpRight,
  Download,
  Wallet,
  ShoppingBag,
  Users,
  Package,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { get, money, date } from '../../services/api';
import type { Order, Status } from '../../types';
import { statusNames } from '../../types';
import { Loading, ErrorState } from '../../components/UI';
import { AnimatedNumber } from '../../components/AnimatedNumber';
interface Stats {
  revenue: number;
  allRevenue: number;
  orders: number;
  processing: number;
  customers: number;
  newCustomers: number;
  products: number;
  lowStock: number;
  cancelled: number;
  series: {
    date: string;
    revenue: number;
    orders: number;
    customers: number;
  }[];
  monthly: { date: string; revenue: number }[];
  status: { name: Status; value: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  topCategories: { name: string; revenue: number }[];
  recentOrders: Order[];
  lowStockProducts: { id: number; name: string; stock: number }[];
}
const colors = ['#ed8d80', '#e7be83', '#9db2a2', '#c4b0d7', '#d4d0ca'];
export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [period, setPeriod] = useState('daily');
  const stats = useQuery({
    queryKey: ['dashboard', days],
    queryFn: () => get<Stats>(`/admin/dashboard?days=${days}`),
  });
  if (stats.isLoading) return <Loading />;
  if (stats.isError || !stats.data) return <ErrorState retry={() => void stats.refetch()} />;
  const s = stats.data;
  const cards = [
    [Wallet, 'Doanh thu trong kỳ', s.revenue, 'Từ đơn đã hoàn tất', 'coral'],
    [ShoppingBag, 'Đơn hàng trong kỳ', s.orders, `${s.processing} đơn đang xử lý`, 'peach'],
    [Users, 'Tổng khách hàng', s.customers, `${s.newCustomers} khách mới trong kỳ`, 'sage'],
    [Package, 'Sản phẩm trong hệ thống', s.products, `${s.lowStock} sản phẩm tồn thấp`, 'lavender'],
  ] as const;
  return (
    <>
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">CHÀO MỪNG TRỞ LẠI NHÀ HDBABY</span>
          <h1>
            Một ngày mới, thêm yêu thương <span className="heading-flower">✳</span>
          </h1>
          <p>Cùng nhìn lại hành trình chăm sóc những khách hàng nhỏ.</p>
        </div>
        <div className="button-row">
          <select
            aria-label="Kỳ báo cáo"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 ngày gần đây</option>
            <option value={30}>30 ngày gần đây</option>
            <option value={180}>6 tháng gần đây</option>
            <option value={365}>12 tháng gần đây</option>
          </select>
          <a className="btn secondary" href={`/api/admin/report.csv?days=${days}`} download>
            <Download size={16} />
            Xuất báo cáo
          </a>
        </div>
      </div>
      <div className="kpi-grid">
        {cards.map(([Icon, label, value, hint, color]) => (
          <div className={`kpi-card ${color}`} key={label}>
            <div>
              <span>{label}</span>
              <i>
                <Icon size={20} />
              </i>
            </div>
            <strong>
              <AnimatedNumber value={value} currency={label === 'Doanh thu trong kỳ'} />
            </strong>
            <small>
              {hint}
              <ArrowUpRight size={14} />
            </small>
          </div>
        ))}
      </div>
      <div className="admin-chart-grid">
        <section className="panel chart-panel">
          <div className="section-head small">
            <div>
              <h2>Nhịp tăng trưởng cửa hàng</h2>
              <p>Doanh thu theo ngày tạo đơn, chỉ tính đơn hoàn tất</p>
            </div>
            <select
              aria-label="Biểu đồ ngày hoặc tháng"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="daily">Theo ngày</option>
              <option value="monthly">Theo tháng</option>
            </select>
          </div>
          <div className="chart-total">
            <strong>{money(s.revenue)}</strong>
            <span>trong {days} ngày qua</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={period === 'daily' ? s.series : s.monthly}
                margin={{ left: 0, right: 12, top: 20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ee978a" stopOpacity={0.3} />
                    <stop offset="1" stopColor="#ee978a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#f0eae5" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={35}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${Number(v) / 1000000}tr`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => money(Number(v))} labelFormatter={(v) => String(v)} />
                <Area
                  isAnimationActive={false}
                  name="Doanh thu"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#e78b7d"
                  strokeWidth={3}
                  fill="url(#revenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel chart-panel status-chart">
          <h2>Đơn hàng trong kỳ</h2>
          <p>Phân bố theo trạng thái</p>
          <div className="donut-chart">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={s.status}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke="none"
                >
                  {s.status.map((x, i) => (
                    <Cell key={x.name} fill={colors[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, statusNames[n as Status]]} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              <strong>{s.orders}</strong>
              <span>đơn hàng</span>
            </div>
          </div>
          <div className="chart-legend">
            {s.status.map((x, i) => (
              <div key={x.name}>
                <span>
                  <i style={{ background: colors[i] }} />
                  {statusNames[x.name]}
                </span>
                <b>{x.value}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="admin-chart-grid">
        <section className="panel">
          <div className="section-head small">
            <h2>Đơn hàng gần đây</h2>
            <Link className="text-link" to="/admin/orders">
              Xem tất cả
              <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {s.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders/${o.id}`}>{o.code}</Link>
                      <small className="table-date">{date(o.createdAt)}</small>
                    </td>
                    <td>{o.user?.name}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <span className={`status status-${o.status}`}>{statusNames[o.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="section-head small">
            <h2>Được lựa chọn nhiều</h2>
            <ShoppingBag size={18} />
          </div>
          <p className="muted">Theo số lượng trong đơn hoàn tất của kỳ</p>
          <div className="top-products">
            {s.topProducts.map((p, i) => (
              <div key={p.name}>
                <span>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <b>{p.name}</b>
                  <small>
                    {p.quantity} sản phẩm · {money(p.revenue)}
                  </small>
                </div>
                <ArrowUpRight size={16} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="admin-chart-grid">
        <section className="panel chart-panel">
          <h2>Doanh số theo danh mục</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.topCategories} layout="vertical" margin={{ left: 20, right: 20 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => `${Number(v) / 1000000}tr`}
                  tick={{ fontSize: 10 }}
                />
                <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => money(Number(v))} />
                <Bar
                  isAnimationActive={false}
                  name="Giá trị hàng hóa"
                  dataKey="revenue"
                  fill="#9fb3a2"
                  radius={[0, 5, 5, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel chart-panel">
          <h2>Khách hàng mới</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.series}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  tick={{ fontSize: 10 }}
                  minTickGap={40}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar
                  isAnimationActive={false}
                  name="Khách hàng mới"
                  dataKey="customers"
                  fill="#c3afd6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <div className="admin-summary-strip">
        <span>
          <Wallet size={18} />
          Doanh thu toàn thời gian <b>{money(s.allRevenue)}</b>
        </span>
        <span>
          <Clock size={18} />
          Đơn hủy toàn thời gian <b>{s.cancelled}</b>
        </span>
        <Link to="/admin/inventory">
          <AlertTriangle size={18} />
          {s.lowStock} sản phẩm cần kiểm tra kho
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </>
  );
}
