import { useQuery } from '@tanstack/react-query';
import { Copy, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { get, money } from '../services/api';
import type { Content } from '../types';
export function VoucherList() {
  const content = useQuery({ queryKey: ['content'], queryFn: () => get<Content>('/content') });
  return (
    <div className="voucher-list">
      {content.data?.vouchers.map((v) => (
        <div className="voucher-card" key={v.id}>
          <Ticket size={25} />
          <div>
            <strong>{v.code}</strong>
            <p>
              Giảm {v.type === 'PERCENT' ? `${v.value}%` : money(v.value)} · tối đa{' '}
              {money(v.maxDiscount)}
            </p>
            <small>
              Đơn từ {money(v.minOrder)} · {v.perUser} lượt/tài khoản · Đến{' '}
              {new Date(v.expiresAt).toLocaleDateString('vi-VN')}
            </small>
          </div>
          <button
            type="button"
            aria-label={`Sao chép ${v.code}`}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(v.code);
                toast.success(`Đã sao chép ${v.code}`);
              } catch {
                toast.info(`Mã ưu đãi: ${v.code}`);
              }
            }}
          >
            <Copy size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
