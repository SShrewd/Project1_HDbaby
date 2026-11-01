import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Mail, MapPin, Phone, Heart, Leaf, Check } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, errorMessage } from '../services/api';
import type { Content, Article, Page } from '../types';
import { PageTitle, Image, Loading, ErrorState, Pagination } from '../components/UI';
const useContent = () =>
  useQuery({ queryKey: ['content'], queryFn: () => get<Content>('/content') });
export function About() {
  const content = useContent();
  return (
    <div className="container info-page">
      <PageTitle
        title="Vì những điều nhỏ xíu, đáng yêu"
        description="Câu chuyện của HDbaby bắt đầu từ sự quan tâm dành cho những năm tháng đầu đời."
      />
      <div className="about-hero">
        <Image src="/assets/hero.webp" alt="Gia đình và khoảnh khắc chăm sóc bé" />
        <div className="about-caption">
          <Heart size={32} />
          <h2>
            Chăm chút từng bữa ăn.
            <br />
            Nâng niu từng tuổi thơ.
          </h2>
        </div>
      </div>
      <div className="prose about-prose">
        <span className="eyebrow">CÙNG BA MẸ, TỪ NHỮNG NGÀY ĐẦU</span>
        <h2>Một hành trình từ yêu thương</h2>
        {content.isLoading ? (
          <Loading />
        ) : content.isError ? (
          <ErrorState retry={() => void content.refetch()} />
        ) : (
          <p>{content.data?.settings.about}</p>
        )}
        <div className="about-values">
          {[
            [Heart, 'Tận tâm', 'Lắng nghe ba mẹ, trân trọng từng lựa chọn dành cho bé.'],
            [Leaf, 'Chu đáo', 'Thông tin rõ ràng, trải nghiệm mua sắm dễ dàng.'],
            [Check, 'Minh bạch', 'Sản phẩm và giao dịch được ghi rõ là dữ liệu minh họa.'],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Heart;
            return (
              <div key={String(title)}>
                <I size={27} />
                <h3>{String(title)}</h3>
                <p>{String(text)}</p>
              </div>
            );
          })}
        </div>
        <Link className="btn" to="/products">
          Khám phá nhà HDbaby
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
export function Blog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const articles = useQuery({
    queryKey: ['articles', page, q],
    queryFn: () => get<Page<Article>>(`/articles?page=${page}&limit=9&q=${encodeURIComponent(q)}`),
  });
  return (
    <div className="container info-page">
      <PageTitle
        title="Một góc nhỏ dành cho ba mẹ"
        description="Cùng chia sẻ, cùng học hỏi, để hành trình chăm bé thêm nhẹ nhàng."
      />
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(search);
          setPage(1);
        }}
      >
        <input
          aria-label="Tìm bài viết"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm điều ba mẹ quan tâm…"
        />
        <button>Tìm bài viết</button>
      </form>
      {articles.isLoading ? (
        <Loading />
      ) : articles.isError ? (
        <ErrorState retry={() => void articles.refetch()} />
      ) : (
        <>
          <div className="article-grid">
            {articles.data?.items.map((a) => (
              <Link key={a.id} className="article-card" to={`/blog/${a.slug}`}>
                <div>
                  <Image src={a.image} alt={a.title} />
                  <span>GÓC CHĂM BÉ</span>
                </div>
                <small>{new Date(a.createdAt).toLocaleDateString('vi-VN')} · Nội dung demo</small>
                <h3>{a.title}</h3>
                <p>{a.excerpt}</p>
                <span className="text-link">
                  Đọc cùng HDbaby
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
          {!articles.data?.items.length && <p className="empty">Chưa tìm thấy bài viết phù hợp.</p>}
          <Pagination page={page} pages={articles.data?.pages || 0} onChange={setPage} />
        </>
      )}
    </div>
  );
}
export function ArticleDetail() {
  const { slug } = useParams();
  const article = useQuery({
    queryKey: ['article', slug],
    queryFn: () => get<Article>(`/articles/${slug}`),
  });
  if (article.isLoading) return <Loading />;
  if (article.isError || !article.data) return <ErrorState retry={() => void article.refetch()} />;
  const a = article.data;
  return (
    <article className="container article-detail">
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/blog">Góc của ba mẹ</Link>
      </div>
      <PageTitle
        eyebrow="GÓC CHĂM BÉ • NỘI DUNG MINH HỌA"
        title={a.title}
        description={a.excerpt}
      />
      <Image src={a.image} alt={a.title} className="article-cover" />
      <div className="prose article-body">
        {a.content
          .split('\n\n')
          .map((p, i) => (i === 0 ? <h2 key={i}>{p}</h2> : <p key={i}>{p}</p>))}
        <Link to="/blog" className="text-link">
          Khám phá thêm bài viết
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  );
}
export function Contact() {
  const content = useContent();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    try {
      await post('/contacts', Object.fromEntries(new FormData(form)));
      form.reset();
      setSent(true);
      toast.success('Lời nhắn đã được lưu. Cảm ơn ba mẹ!');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container info-page">
      <PageTitle
        title="Chúng mình luôn ở đây"
        description="Có điều muốn hỏi, có chuyện muốn chia sẻ? HDbaby sẵn lòng lắng nghe ba mẹ."
      />
      <div className="contact-layout">
        <div className="contact-info">
          <span className="eyebrow">KẾT NỐI CÙNG HDBABY</span>
          <h2>
            Một lời nhắn nhỏ,
            <br />
            một kết nối ấm áp.
          </h2>
          <div>
            <Phone />
            <span>
              <small>Gọi cho chúng mình</small>
              <b>{content.data?.settings.phone}</b>
            </span>
          </div>
          <div>
            <Mail />
            <span>
              <small>Hộp thư yêu thương</small>
              <b>{content.data?.settings.email}</b>
            </span>
          </div>
          <div>
            <MapPin />
            <span>
              <small>Địa chỉ minh họa</small>
              <b>{content.data?.settings.address}</b>
            </span>
          </div>
          <p className="fine-print">
            Thông tin liên hệ và địa chỉ dùng cho đồ án. Biểu mẫu lưu tin nhắn vào hệ thống quản
            trị.
          </p>
        </div>
        <form className="panel form-stack" onSubmit={submit}>
          <h2>Ba mẹ muốn nhắn gì?</h2>
          {sent && (
            <p className="notice success" role="status">
              Lời nhắn đã được lưu thành công.
            </p>
          )}
          <label>
            Họ và tên
            <input name="name" required minLength={2} maxLength={200} />
          </label>
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Lời nhắn của ba mẹ
            <textarea name="message" required minLength={10} maxLength={5000} rows={5} />
          </label>
          <button className="btn" disabled={busy}>
            Gửi lời nhắn
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
    </div>
  );
}
export function FaqPage() {
  const content = useContent();
  return (
    <div className="container info-page">
      <PageTitle
        title="Ba mẹ hỏi, HDbaby đáp"
        description="Những lời giải đáp nhỏ, để ba mẹ an tâm hơn mỗi lần ghé thăm."
      />
      {content.isLoading ? (
        <Loading />
      ) : content.isError ? (
        <ErrorState retry={() => void content.refetch()} />
      ) : (
        <div className="accordion faq-page">
          {content.data?.faqs.map((f) => (
            <details key={f.id}>
              <summary>
                {f.question}
                <span>+</span>
              </summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      )}
      <div className="center">
        <p>Ba mẹ còn thắc mắc khác?</p>
        <Link className="btn" to="/contact">
          Trò chuyện cùng chúng mình
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}
export function Policy() {
  const { type } = useParams();
  const content = useContent();
  const policies: Record<string, [string, string]> = {
    shipping: ['Chính sách giao hàng', 'shippingPolicy'],
    returns: ['Chính sách đổi trả', 'returnPolicy'],
    privacy: ['Bảo mật thông tin', 'privacyPolicy'],
  };
  const current = policies[type || ''];
  if (!current) return <NotFound />;
  return (
    <div className="container info-page">
      <PageTitle title={current[0]} description="Minh bạch và rõ ràng, để ba mẹ luôn an tâm." />
      <div className="prose panel policy-content">
        {content.isLoading ? (
          <Loading />
        ) : content.isError ? (
          <ErrorState retry={() => void content.refetch()} />
        ) : (
          <p>{content.data?.settings[current[1]]}</p>
        )}
        <p>Đây là chính sách minh họa trong đồ án HDbaby.</p>
        <Link to="/contact" className="text-link">
          Liên hệ hỗ trợ
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container not-found">
      <span>
        4<Heart size={70} strokeWidth={1.2} />4
      </span>
      <h1>Hình như ba mẹ đi lạc một chút!</h1>
      <p>Trang này không còn ở đây. Mời ba mẹ về nhà HDbaby nhé.</p>
      <Link className="btn" to="/">
        Về trang chủ
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}
