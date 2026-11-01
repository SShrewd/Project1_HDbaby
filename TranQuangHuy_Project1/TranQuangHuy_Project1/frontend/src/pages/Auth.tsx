import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, ArrowLeft, Eye, EyeOff, Heart, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { post, errorMessage } from '../services/api';
import { useShop } from '../contexts/ShopContext';
import type { User } from '../types';
const strong = z
  .string()
  .min(10, 'Ít nhất 10 ký tự')
  .regex(/[a-z]/, 'Cần chữ thường')
  .regex(/[A-Z]/, 'Cần chữ hoa')
  .regex(/[0-9]/, 'Cần chữ số')
  .regex(/[^a-zA-Z0-9]/, 'Cần ký tự đặc biệt');
export default function Auth({
  mode = 'login',
}: {
  mode?: 'login' | 'register' | 'forgot' | 'reset';
}) {
  const { user, login } = useShop();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const submitted = useRef(false);
  const schema = z.object({
    email: mode === 'reset' ? z.string().optional() : z.email('Email không hợp lệ'),
    password:
      mode === 'forgot'
        ? z.string().optional()
        : mode === 'login'
          ? z.string().min(1, 'Nhập mật khẩu')
          : strong,
    name: mode === 'register' ? z.string().min(2, 'Nhập họ tên') : z.string().optional(),
    phone:
      mode === 'register'
        ? z.string().regex(/^(\+84|0)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ')
        : z.string().optional(),
  });
  type Input = z.infer<typeof schema>;
  const form = useForm<Input>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });
  const titles = {
    login: 'Ba mẹ ơi, chào mừng trở lại!',
    register: 'Bắt đầu một hành trình mới',
    forgot: 'Tìm lại chìa khóa nhỏ',
    reset: 'Một mật khẩu mới, an tâm hơn',
  };
  if (user && !submitted.current && (mode === 'login' || mode === 'register'))
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/account'} replace />;
  async function submit(data: Input) {
    submitted.current = true;
    try {
      if (mode === 'login' || mode === 'register') {
        const u = await post<User>(`/auth/${mode}`, data);
        await login(u);
        toast.success(mode === 'login' ? 'Chào mừng ba mẹ trở lại!' : 'Tạo tài khoản thành công!');
        const next = params.get('next');
        navigate(
          next?.startsWith('/') && !next.startsWith('//')
            ? next
            : u.role === 'ADMIN'
              ? '/admin'
              : '/account',
        );
      } else if (mode === 'forgot') {
        const result = await post<{ message: string }>('/auth/forgot-password', {
          email: data.email,
        });
        setMessage(result.message);
      } else {
        await post('/auth/reset-password', {
          token: params.get('token'),
          password: data.password,
        });
        toast.success('Đã đặt lại mật khẩu');
        navigate('/login');
      }
    } catch (e) {
      submitted.current = false;
      form.setError('root', { message: errorMessage(e) });
    }
  }
  return (
    <div className="container auth-page">
      <div className="auth-art">
        <img src="/assets/hero.webp" alt="Mẹ và bé trong khoảnh khắc ấm áp" />
        <div>
          <Heart size={35} strokeWidth={1.2} />
          <h2>
            Thật vui vì có ba mẹ
            <br />
            trên hành trình này.
          </h2>
          <p>Mỗi ngày lớn khôn, thêm một chút yêu thương.</p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <Link to="/" className="text-link">
          <ArrowLeft size={16} />
          Về nhà HDbaby
        </Link>
        <span className="eyebrow">CHÀO BA MẸ ĐẾN VỚI HDBABY</span>
        <h1>{titles[mode]}</h1>
        <p>
          {mode === 'login'
            ? 'Đăng nhập để lưu những lựa chọn và theo dõi đơn hàng của mình.'
            : mode === 'register'
              ? 'Một tài khoản nhỏ, để chúng mình đồng hành cùng ba mẹ.'
              : 'Chúng mình sẽ giúp ba mẹ truy cập lại tài khoản an toàn.'}
        </p>
        {message ? (
          <div className="notice success">
            <LockKeyhole />
            <p>{message}</p>
            <Link to="/login">Quay lại đăng nhập</Link>
          </div>
        ) : (
          <form className="form-stack" onSubmit={form.handleSubmit(submit)} noValidate>
            {mode === 'register' && (
              <>
                <label>
                  Họ và tên
                  <input
                    autoComplete="name"
                    {...form.register('name')}
                    placeholder="Tên của ba mẹ"
                  />
                  {form.formState.errors.name && (
                    <small className="field-error">{form.formState.errors.name.message}</small>
                  )}
                </label>
                <label>
                  Số điện thoại
                  <input autoComplete="tel" {...form.register('phone')} placeholder="09xxxxxxxx" />
                  {form.formState.errors.phone && (
                    <small className="field-error">{form.formState.errors.phone.message}</small>
                  )}
                </label>
              </>
            )}
            {mode !== 'reset' && (
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  {...form.register('email')}
                  placeholder="bame@example.com"
                />
                {form.formState.errors.email && (
                  <small className="field-error">{form.formState.errors.email.message}</small>
                )}
              </label>
            )}
            {mode !== 'forgot' && (
              <label>
                Mật khẩu
                <div className="password-input">
                  <input
                    type={visible ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    {...form.register('password')}
                    placeholder={
                      mode === 'login'
                        ? 'Mật khẩu của ba mẹ'
                        : 'Ít nhất 10 ký tự, hoa, thường, số, ký tự đặc biệt'
                    }
                  />
                  <button
                    type="button"
                    aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <small className="field-error">{form.formState.errors.password.message}</small>
                )}
              </label>
            )}
            {mode === 'login' && (
              <Link className="forgot-link" to="/forgot-password">
                Ba mẹ quên mật khẩu?
              </Link>
            )}
            {form.formState.errors.root && (
              <p role="alert" className="field-error">
                {form.formState.errors.root.message}
              </p>
            )}
            <button className="btn full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? 'Đang xử lý…'
                : mode === 'login'
                  ? 'Đăng nhập'
                  : mode === 'register'
                    ? 'Tạo tài khoản'
                    : mode === 'forgot'
                      ? 'Gửi hướng dẫn'
                      : 'Đặt lại mật khẩu'}
              <ArrowRight size={18} />
            </button>
          </form>
        )}
        <div className="auth-switch">
          {mode === 'login' ? (
            <>
              Ba mẹ chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
            </>
          ) : (
            <Link to="/login">Đã có tài khoản? Đăng nhập</Link>
          )}
        </div>
        <p className="fine-print">Website đồ án • Không nhập thông tin cá nhân nhạy cảm.</p>
      </div>
    </div>
  );
}
