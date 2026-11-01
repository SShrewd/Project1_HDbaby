import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useShop } from '../contexts/ShopContext';
import { money } from '../services/api';
import { PageTitle, Empty, Image, Quantity, Loading } from '../components/UI';
export function CheckoutSteps({ step }: { step: number }) {
  return (
    <div className="checkout-steps">
      {['Giỏ hàng', 'Thông tin nhận hàng', 'Xác nhận đơn'].map((label, i) => (
        <div key={label} className={i <= step ? 'active' : ''}>
          <span>{i < step ? <Check size={15} /> : i + 1}</span>
          <b>{label}</b>
          {i < 2 && <i />}
        </div>
      ))}
    </div>
  );
}
export default function Cart() {
  const { cart, cartLoading, user, update, deleteItem } = useShop();
  const navigate = useNavigate();
  if (cartLoading) return <Loading />;
  const selected = cart.filter((i) => i.selected);
  const subtotal = selected.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const shipping = subtotal >= 499000 ? 0 : 25000;
  function checkout() {
    if (!selected.length) {
      toast.error('Ba mẹ chọn ít nhất một sản phẩm nhé');
      return;
    }
    if (selected.some((i) => i.quantity > i.product.stock || !i.product.active)) {
      toast.error('Có sản phẩm không đủ tồn kho hoặc ngừng bán');
      return;
    }
    navigate(user ? '/checkout' : '/login?next=/checkout');
  }
  return (
    <div className="container cart-page">
      <PageTitle
        title="Giỏ nhỏ, đầy yêu thương"
        description="Kiểm tra lại những lựa chọn dành cho bé trước khi đặt hàng nhé."
      />
      <CheckoutSteps step={0} />
      {!cart.length ? (
        <Empty title="Giỏ hàng đang chờ yêu thương" />
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-table-head">
              <label>
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả sản phẩm"
                  checked={cart.every((i) => i.selected)}
                  onChange={(e) =>
                    void Promise.all(cart.map((i) => update(i.id, { selected: e.target.checked })))
                  }
                />
                Chọn tất cả ({cart.length})
              </label>
              <span>Thành tiền</span>
            </div>
            {cart.map((i) => (
              <div className="cart-item" key={i.id}>
                <input
                  type="checkbox"
                  aria-label={`Chọn ${i.product.name}`}
                  checked={i.selected}
                  onChange={(e) => void update(i.id, { selected: e.target.checked })}
                />
                <Link to={`/products/${i.product.slug}`}>
                  <Image src={i.product.images[0]?.url} alt={i.product.name} />
                </Link>
                <div className="cart-item-info">
                  <small>{i.product.brand.name}</small>
                  <Link to={`/products/${i.product.slug}`}>{i.product.name}</Link>
                  <strong>{money(i.product.price)}</strong>
                  {Number(i.priceAtAdd) !== Number(i.product.price) && (
                    <span className="field-error">Giá đã thay đổi từ {money(i.priceAtAdd)}</span>
                  )}
                  {i.quantity > i.product.stock && (
                    <span className="field-error">Không đủ tồn kho, còn {i.product.stock}</span>
                  )}
                  <Quantity
                    value={i.quantity}
                    max={i.product.stock}
                    onChange={(quantity) => void update(i.id, { quantity })}
                  />
                </div>
                <div className="cart-item-total">
                  <strong>{money(Number(i.product.price) * i.quantity)}</strong>
                  <button
                    aria-label={`Xóa ${i.product.name}`}
                    onClick={() => void deleteItem(i.id)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            <Link className="text-link continue-shopping" to="/products">
              <ShoppingBag size={17} />
              Tiếp tục chọn đồ cho bé
              <ArrowRight size={16} />
            </Link>
          </div>
          <aside className="order-summary">
            <h2>Đơn hàng của ba mẹ</h2>
            <div className="summary-line">
              <span>Tạm tính ({selected.length} sản phẩm)</span>
              <b>{money(subtotal)}</b>
            </div>
            <div className="summary-line">
              <span>Giao tiêu chuẩn dự kiến</span>
              <span>{subtotal ? money(shipping) : '—'}</span>
            </div>
            {subtotal < 499000 && subtotal > 0 && (
              <div className="shipping-progress">
                <Truck size={18} />
                <p>
                  Thêm <b>{money(499000 - subtotal)}</b> để được miễn phí giao tiêu chuẩn.
                </p>
                <div>
                  <span
                    style={{
                      width: `${Math.min(100, (subtotal / 499000) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <div className="summary-total">
              <span>Tổng dự kiến</span>
              <strong>{money(subtotal + (subtotal ? shipping : 0))}</strong>
            </div>
            <button className="btn full" disabled={!selected.length} onClick={checkout}>
              Tiếp tục thanh toán
              <ArrowRight size={18} />
            </button>
            <p className="summary-note">
              <ShieldCheck size={15} />
              Giá và tồn kho được kiểm tra lại khi đặt hàng.
            </p>
            <Link to="/promotions" className="text-link">
              Khám phá mã ưu đãi
              <ArrowRight size={14} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
