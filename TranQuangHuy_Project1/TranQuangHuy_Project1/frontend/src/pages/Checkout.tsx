import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft, Check, ShieldCheck, PartyPopper, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, money, errorMessage, queryClient } from '../services/api';
import { useShop } from '../contexts/ShopContext';
import type { Address, Order } from '../types';
import { Image, Empty } from '../components/UI';
import { CheckoutSteps } from './Cart';
const schema = z.object({
  recipient: z.string().trim().min(2, 'Nhập tên người nhận'),
  phone: z.string().regex(/^(\+84|0)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
  city: z.string().trim().min(2, 'Nhập tỉnh/thành'),
  district: z.string().trim().min(2, 'Nhập quận/huyện'),
  address: z.string().trim().min(5, 'Nhập địa chỉ chi tiết'),
  note: z.string().max(2000),
  delivery: z.enum(['standard', 'express']),
  payment: z.enum(['COD', 'BANK_DEMO']),
  voucher: z.string().max(100),
});
type Input = z.infer<typeof schema>;
interface Quote {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}
export default function Checkout() {
  const { user, cart } = useShop();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());
  const snapshot = useRef<unknown>(null);
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      recipient: user?.name || '',
      phone: user?.phone || '',
      city: '',
      district: '',
      address: '',
      note: '',
      delivery: 'standard',
      payment: 'COD',
      voucher: '',
    },
  });
  const addresses = useQuery({
    queryKey: ['addresses'],
    queryFn: () => get<Address[]>('/addresses'),
  });
  const selected = cart.filter((i) => i.selected);
  const items = selected.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
  }));
  async function review(data: Input) {
    setBusy(true);
    try {
      const payload = { ...data, items };
      const result = await post<Quote>('/orders/quote', payload);
      setQuote(result);
      snapshot.current = payload;
      key.current = crypto.randomUUID();
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function place() {
    if (!quote || busy) return;
    setBusy(true);
    try {
      const result = await post<Order>(
        '/orders',
        { ...(snapshot.current as object), expectedTotal: quote.total },
        { 'Idempotency-Key': key.current },
      );
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/order-success/${result.id}`);
    } catch (e) {
      toast.error(errorMessage(e));
      setStep(1);
    } finally {
      setBusy(false);
    }
  }
  if (!selected.length)
    return <Empty title="Chọn sản phẩm trước khi thanh toán" to="/cart" label="Về giỏ hàng" />;
  return (
    <div className="container checkout-page">
      <div className="page-title">
        <span className="eyebrow">THÊM MỘT BƯỚC, THÊM YÊU THƯƠNG</span>
        <h1>{step === 1 ? 'Gửi đến tổ ấm của ba mẹ' : 'Mọi thứ đã sẵn sàng cho bé'}</h1>
      </div>
      <CheckoutSteps step={step} />
      <div className="cart-layout">
        <div className="checkout-form panel">
          {step === 1 ? (
            <form id="checkout-form" className="form-stack" onSubmit={form.handleSubmit(review)}>
              <h2>Thông tin nhận hàng</h2>
              {!!addresses.data?.length && (
                <label>
                  Chọn địa chỉ đã lưu
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const a = addresses.data?.find((a) => a.id === Number(e.target.value));
                      if (a) {
                        form.setValue('recipient', a.name);
                        form.setValue('phone', a.phone);
                        form.setValue('city', a.city);
                        form.setValue('district', a.district);
                        form.setValue('address', a.detail);
                        void form.trigger();
                      }
                    }}
                  >
                    <option value="">Nhập địa chỉ mới</option>
                    {addresses.data.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — {a.detail}, {a.city}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="form-grid">
                {[
                  ['recipient', 'Họ tên người nhận'],
                  ['phone', 'Số điện thoại'],
                  ['city', 'Tỉnh / thành phố'],
                  ['district', 'Quận / huyện'],
                  ['address', 'Địa chỉ chi tiết'],
                ].map(([field, label]) => (
                  <label key={field} className={field === 'address' ? 'span-2' : ''}>
                    {label}
                    <input {...form.register(field as keyof Input)} />
                    {form.formState.errors[field as keyof Input] && (
                      <small className="field-error">
                        {form.formState.errors[field as keyof Input]?.message}
                      </small>
                    )}
                  </label>
                ))}
              </div>
              <label>
                Ghi chú cho đơn hàng
                <textarea
                  {...form.register('note')}
                  rows={3}
                  placeholder="Điều ba mẹ muốn nhắn gửi…"
                />
              </label>
              <h3>Phương thức giao hàng</h3>
              <label className="choice-card">
                <input type="radio" value="standard" {...form.register('delivery')} />
                <div>
                  <b>Giao tiêu chuẩn</b>
                  <small>2–4 ngày · 25.000đ, miễn phí từ 499.000đ</small>
                </div>
              </label>
              <label className="choice-card">
                <input type="radio" value="express" {...form.register('delivery')} />
                <div>
                  <b>Giao nhanh</b>
                  <small>1–2 ngày · 45.000đ</small>
                </div>
              </label>
              <h3>Phương thức thanh toán</h3>
              <label className="choice-card">
                <input type="radio" value="COD" {...form.register('payment')} />
                <div>
                  <b>Thanh toán khi nhận hàng (COD)</b>
                  <small>Giao dịch minh họa trong đồ án</small>
                </div>
              </label>
              <label className="choice-card">
                <input type="radio" value="BANK_DEMO" {...form.register('payment')} />
                <div>
                  <b>Chuyển khoản mô phỏng</b>
                  <small>Không chuyển tiền thật. Admin xác nhận quy trình demo.</small>
                </div>
              </label>
              <label>
                Mã ưu đãi
                <input
                  {...form.register('voucher')}
                  placeholder="Thử HELLOBABY"
                  className="uppercase"
                />
              </label>
              <button className="btn" disabled={busy}>
                Kiểm tra & xác nhận đơn
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <>
              <h2>Ba mẹ kiểm tra lại nhé</h2>
              <dl className="confirmation-details">
                <dt>Người nhận</dt>
                <dd>
                  {form.getValues('recipient')} · {form.getValues('phone')}
                </dd>
                <dt>Địa chỉ</dt>
                <dd>
                  {form.getValues('address')}, {form.getValues('district')},{' '}
                  {form.getValues('city')}
                </dd>
                <dt>Giao hàng</dt>
                <dd>
                  {form.getValues('delivery') === 'express' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}
                </dd>
                <dt>Thanh toán</dt>
                <dd>
                  {form.getValues('payment') === 'COD'
                    ? 'Khi nhận hàng (COD)'
                    : 'Chuyển khoản mô phỏng — không chuyển tiền thật'}
                </dd>
                <dt>Ghi chú</dt>
                <dd>{form.getValues('note') || 'Không có'}</dd>
              </dl>
              <div className="notice">
                <ShieldCheck size={24} />
                <p>Đây là giao dịch demo, không phát sinh thanh toán hoặc giao hàng thật.</p>
              </div>
              <div className="button-row">
                <button className="btn secondary" onClick={() => setStep(1)} disabled={busy}>
                  <ArrowLeft size={16} />
                  Chỉnh sửa
                </button>
                <button className="btn" onClick={() => void place()} disabled={busy}>
                  {busy ? 'Đang tạo đơn…' : 'Xác nhận đặt hàng'}
                  <Check size={17} />
                </button>
              </div>
            </>
          )}
        </div>
        <aside className="order-summary">
          <h2>Những lựa chọn cho bé</h2>
          {selected.map((i) => (
            <div className="checkout-item" key={i.id}>
              <Image src={i.product.images[0]?.url} alt={i.product.name} />
              <div>
                <b>{i.product.name}</b>
                <small>
                  {i.quantity} × {money(i.product.price)}
                </small>
              </div>
            </div>
          ))}
          {quote && step === 2 ? (
            <>
              <div className="summary-line">
                <span>Tạm tính</span>
                <b>{money(quote.subtotal)}</b>
              </div>
              <div className="summary-line">
                <span>Ưu đãi</span>
                <span>−{money(quote.discount)}</span>
              </div>
              <div className="summary-line">
                <span>Phí vận chuyển</span>
                <span>{money(quote.shipping)}</span>
              </div>
              <div className="summary-total">
                <span>Tổng thanh toán</span>
                <strong>{money(quote.total)}</strong>
              </div>
            </>
          ) : (
            <p className="muted">Tổng tiền được tính khi kiểm tra đơn và mã ưu đãi.</p>
          )}
          <Link className="text-link" to="/cart">
            <ArrowLeft size={15} />
            Về giỏ hàng
          </Link>
        </aside>
      </div>
    </div>
  );
}
export function OrderSuccess() {
  const { id } = useParamsSafe();
  const order = useQuery({
    queryKey: ['order', id],
    queryFn: () => get<Order>(`/orders/${id}`),
  });
  return (
    <div className="container success-page">
      <div className="success-illustration">
        <PackageCheck size={65} strokeWidth={1} />
        <PartyPopper className="success-confetti" size={32} />
      </div>
      <span className="eyebrow">MỘT ĐƠN HÀNG, THẬT NHIỀU YÊU THƯƠNG</span>
      <h1>Cảm ơn ba mẹ đã chọn HDbaby!</h1>
      <p>Chúng mình đã nhận được đơn hàng. Ba mẹ có thể theo dõi từng bước trong tài khoản.</p>
      {order.data && (
        <div className="success-order">
          <span>
            Mã đơn hàng<strong>{order.data.code}</strong>
          </span>
          <span>
            Tổng thanh toán<strong>{money(order.data.total)}</strong>
          </span>
        </div>
      )}
      <div className="button-row">
        <Link className="btn" to={`/account/orders/${id}`}>
          Theo dõi đơn hàng
          <ArrowRight size={17} />
        </Link>
        <Link className="btn secondary" to="/products">
          Tiếp tục khám phá
        </Link>
      </div>
      <small>Giao dịch minh họa • Không phát sinh thanh toán thật.</small>
    </div>
  );
}
import { useParams as useParamsSafe } from 'react-router-dom';
