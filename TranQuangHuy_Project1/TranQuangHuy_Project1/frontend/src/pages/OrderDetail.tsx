import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, ShoppingBag, Star, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, patch, date, money, errorMessage, queryClient } from '../services/api';
import { useShop } from '../contexts/ShopContext';
import type { Order, OrderItem, Product, Status, Review } from '../types';
import { statusNames } from '../types';
import { Loading, ErrorState, Image, Modal } from '../components/UI';
const transitions: Record<Status, Status[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};
export default function OrderDetail({ admin = false }: { admin?: boolean }) {
  const { id } = useParams();
  const { add } = useShop();
  const [cancel, setCancel] = useState(false);
  const [review, setReview] = useState<OrderItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<Status | ' '>(' ');
  const [note, setNote] = useState('');
  const order = useQuery({
    queryKey: [admin ? 'admin-order' : 'order', id],
    queryFn: () => get<Order>(`${admin ? '/admin' : ''}/orders/${id}`),
  });
  const reviews = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => get<Review[]>('/my-reviews'),
    enabled: !admin,
  });
  if (order.isLoading) return <Loading />;
  if (order.isError || !order.data) return <ErrorState retry={() => void order.refetch()} />;
  const o = order.data;
  async function cancelOrder() {
    setBusy(true);
    try {
      await patch(`/orders/${id}/cancel`, {});
      await order.refetch();
      setCancel(false);
      toast.success('Đã hủy đơn và hoàn kho');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reorder() {
    setBusy(true);
    try {
      for (const item of o.items) {
        const products = await get<{ items: Product[] }>(
          `/products?q=${encodeURIComponent(item.sku)}&limit=1`,
        );
        if (products.items[0]) await add(products.items[0], item.quantity);
        else toast.error(`${item.name} đã ngừng kinh doanh`);
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submitReview(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    try {
      await post('/reviews', {
        productId: review!.productId,
        orderId: o.id,
        rating: Number(data.rating),
        content: data.content,
      });
      toast.success('Đã lưu đánh giá');
      setReview(null);
      await queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const previous = reviews.data?.find(
    (r) => r.orderId === o.id && r.productId === review?.productId,
  );
  return (
    <div className={admin ? 'order-detail' : 'container order-detail standalone'}>
      <div className="section-head">
        <Link className="text-link" to={admin ? '/admin/orders' : '/account/orders'}>
          <ArrowLeft size={16} />
          Danh sách đơn hàng
        </Link>
        <button className="btn secondary small" onClick={() => window.print()}>
          <Printer size={16} />
          In đơn
        </button>
      </div>
      <div className="order-detail-header">
        <div>
          <span className="eyebrow">CHI TIẾT ĐƠN HÀNG</span>
          <h1>{o.code}</h1>
          <p>{date(o.createdAt)}</p>
        </div>
        <span className={`status status-${o.status}`}>{statusNames[o.status]}</span>
      </div>
      <div className="order-timeline">
        {o.history.map((h, i) => (
          <div key={h.id}>
            <span>{i === o.history.length - 1 ? <PackageCheck size={17} /> : <i />}</span>
            <div>
              <b>{statusNames[h.status]}</b>
              <small>{date(h.createdAt)}</small>
              <p>{h.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="order-info-grid">
        <section className="panel">
          <h3>Gửi đến tổ ấm</h3>
          <b>
            {o.recipient} · {o.phone}
          </b>
          <p>
            {o.address}, {o.district}, {o.city}
          </p>
          <p>{o.note || 'Không có ghi chú'}</p>
        </section>
        <section className="panel">
          <h3>Thanh toán & giao hàng</h3>
          <p>{o.payment === 'COD' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản mô phỏng'}</p>
          <p>
            {o.paymentStatus === 'PAID' ? 'Đã hoàn tất thanh toán mẫu' : 'Chưa thanh toán'} ·{' '}
            {o.delivery === 'express' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}
          </p>
          <small>Giao dịch demo, không chuyển tiền thật.</small>
        </section>
      </div>
      <div className="panel order-items">
        {o.items.map((i) => (
          <div className="order-item" key={i.id}>
            <Image src={i.image} alt={i.name} />
            <div>
              <b>{i.name}</b>
              <small>
                SKU {i.sku} · Số lượng: {i.quantity}
              </small>
              {!admin && o.status === 'COMPLETED' && (
                <button className="text-link" onClick={() => setReview(i)}>
                  <Star size={14} />
                  {reviews.data?.some((r) => r.orderId === o.id && r.productId === i.productId)
                    ? 'Chỉnh sửa đánh giá'
                    : 'Viết đánh giá'}
                </button>
              )}
            </div>
            <strong>{money(Number(i.price) * i.quantity)}</strong>
          </div>
        ))}
        <div className="order-totals">
          <div>
            <span>Tạm tính</span>
            <b>{money(o.subtotal)}</b>
          </div>
          <div>
            <span>Giảm giá</span>
            <b>−{money(o.discount)}</b>
          </div>
          <div>
            <span>Phí vận chuyển</span>
            <b>{money(o.shipping)}</b>
          </div>
          <div className="summary-total">
            <span>Tổng thanh toán</span>
            <strong>{money(o.total)}</strong>
          </div>
        </div>
      </div>
      {admin ? (
        <form
          className="panel form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (next === ' ') return;
            setBusy(true);
            try {
              await patch(`/admin/orders/${id}/status`, { status: next, note });
              await order.refetch();
              setNext(' ');
              toast.success('Đã cập nhật trạng thái');
            } catch (e) {
              toast.error(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Cập nhật trạng thái</h3>
          {transitions[o.status].length ? (
            <>
              <label>
                Trạng thái tiếp theo
                <select value={next} onChange={(e) => setNext(e.target.value as Status)} required>
                  <option value=" ">Chọn trạng thái</option>
                  {transitions[o.status].map((s) => (
                    <option key={s} value={s}>
                      {statusNames[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú xử lý
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
              </label>
              <button className="btn" disabled={busy || next === ' '}>
                Lưu trạng thái
              </button>
            </>
          ) : (
            <p>Đơn hàng đã kết thúc quy trình.</p>
          )}
        </form>
      ) : (
        <div className="button-row">
          <button className="btn secondary" disabled={busy} onClick={() => void reorder()}>
            <ShoppingBag size={17} />
            Mua lại sản phẩm
          </button>
          {['PENDING', 'CONFIRMED'].includes(o.status) && (
            <button className="btn danger" disabled={busy} onClick={() => setCancel(true)}>
              Hủy đơn hàng
            </button>
          )}
        </div>
      )}
      {cancel && (
        <Modal title="Ba mẹ muốn hủy đơn hàng?" onClose={() => setCancel(false)}>
          <p>Đơn hàng sẽ được hủy và số lượng sản phẩm sẽ được hoàn vào kho.</p>
          <div className="button-row">
            <button className="btn secondary" onClick={() => setCancel(false)}>
              Giữ đơn hàng
            </button>
            <button className="btn danger" disabled={busy} onClick={() => void cancelOrder()}>
              Xác nhận hủy
            </button>
          </div>
        </Modal>
      )}
      {review && (
        <Modal title="Chia sẻ trải nghiệm của ba mẹ" onClose={() => setReview(null)}>
          <p>{review.name}</p>
          <form className="form-stack" onSubmit={submitReview}>
            <label>
              Số sao
              <select name="rating" defaultValue={previous?.rating || 5}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option value={n} key={n}>
                    {'★'.repeat(n)} — {n} sao
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nhận xét
              <textarea
                name="content"
                minLength={10}
                maxLength={3000}
                rows={4}
                required
                defaultValue={previous?.content}
              />
            </label>
            <small>Đánh giá chỉnh sửa được gửi duyệt lại.</small>
            <button className="btn" disabled={busy}>
              Gửi đánh giá
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
