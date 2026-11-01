import { useState, useEffect, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, ExternalLink, Upload, Check } from 'lucide-react';
import { toast } from 'sonner';
import { get, post, patch, remove, errorMessage, queryClient, date } from '../../services/api';
import type { Page } from '../../types';
import { Modal, Loading, ErrorState, Pagination, Empty, Image } from '../../components/UI';
import { resourceConfigs, type Field, type Row } from './config';
export function nested(row: Row, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (value, k) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[k] : undefined,
      row,
    );
}
export function renderValue(value: unknown, key: string) {
  if (typeof value === 'boolean')
    return (
      <span className={`badge ${value ? 'positive' : 'muted-badge'}`}>
        {value ? 'Có' : 'Không'}
      </span>
    );
  if (key.endsWith('At') && typeof value === 'string') return date(value);
  if (value === null || value === undefined) return '—';
  return String(value);
}
export function FieldInput({
  field,
  value,
  onChange,
  disabled = false,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const f = field;
  if (f.type === 'boolean')
    return (
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        {f.label}
      </label>
    );
  return (
    <label className={f.type === 'textarea' || f.type === 'image' ? 'span-2' : ''}>
      {f.label}
      {f.type === 'textarea' ? (
        <textarea
          required={f.required}
          value={String(value ?? '')}
          rows={f.key === 'content' ? 12 : 3}
          onChange={(e) => onChange(e.target.value)}
          maxLength={f.key === 'content' ? 50000 : 10000}
        />
      ) : f.type === 'select' ? (
        <select
          aria-label={f.label}
          required={f.required}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Chọn {f.label.toLowerCase()}</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.type === 'image' ? (
        <ImageUpload
          value={[String(value || '/assets/product-0.webp')]}
          onChange={(images) => onChange(images[0])}
          multiple={false}
        />
      ) : (
        <input
          type={f.type === 'date' ? 'datetime-local' : f.type === 'number' ? 'number' : 'text'}
          min={f.min}
          max={f.max}
          required={f.required || f.type === 'number'}
          disabled={disabled}
          value={f.type === 'date' ? toLocalDate(String(value || '')) : String(value ?? '')}
          onChange={(e) =>
            onChange(
              f.type === 'number'
                ? e.target.value === ''
                  ? ''
                  : Number(e.target.value)
                : e.target.value,
            )
          }
          maxLength={f.type !== 'number' ? 255 : undefined}
        />
      )}
    </label>
  );
}
function toLocalDate(value: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function ImageUpload({
  value,
  onChange,
  multiple = true,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  multiple?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    const data = new FormData();
    for (const file of files) data.append('images', file);
    try {
      const urls = await post<string[]>('/admin/uploads', data);
      onChange(multiple ? [...value, ...urls].slice(0, 10) : [urls[0]]);
      toast.success('Đã tải ảnh');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="image-uploader">
      <div className="upload-previews">
        {value.map((src, i) => (
          <div key={`${src}-${i}`}>
            <Image src={src} alt={`Ảnh ${i + 1}`} />
            {multiple && (
              <>
                <button
                  type="button"
                  className={i === 0 ? 'cover active' : 'cover'}
                  title="Chọn làm ảnh đại diện"
                  onClick={() => onChange([src, ...value.filter((_, j) => j !== i)])}
                >
                  {i === 0 ? <Check size={12} /> : <span>Đại diện</span>}
                </button>
                <button
                  type="button"
                  className="remove-image"
                  aria-label={`Xóa ảnh ${i + 1}`}
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      <label className="upload-button">
        <Upload size={16} />
        {busy ? 'Đang tải…' : 'Tải ảnh JPG / PNG / WebP'}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          disabled={busy}
          onChange={(e) => void upload(e.target.files)}
        />
      </label>
      <small>Tối đa 5 MB/ảnh · {multiple ? '10 ảnh, ảnh đầu tiên là ảnh đại diện' : '1 ảnh'}</small>
    </div>
  );
}
export default function ResourcePage() {
  const { resource = '' } = useParams();
  const config = Object.hasOwn(resourceConfigs, resource) ? resourceConfigs[resource] : undefined;
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('');
  const [term, setTerm] = useState('');
  const [editing, setEditing] = useState<Row | null | undefined>();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: ['admin-resource', resource, page, q, sort],
    queryFn: () =>
      get<Page<Row>>(`/admin/${resource}?page=${page}&q=${encodeURIComponent(q)}&sort=${sort}`),
    enabled: !!config,
  });
  useEffect(() => {
    setPage(1);
    setQ('');
    setTerm('');
    setEditing(undefined);
    setDeleting(null);
  }, [resource]);
  if (!config) return <Empty title="Chức năng không tồn tại" to="/admin" label="Về tổng quan" />;
  function edit(row: Row | null) {
    if (!config) return;
    setValues(
      Object.fromEntries(
        config.fields.map((f) => [
          f.key,
          row?.[f.key] ?? f.default ?? (f.type === 'boolean' ? false : ''),
        ]),
      ),
    );
    setEditing(row);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    setBusy(true);
    try {
      const body = { ...values };
      for (const f of config.fields)
        if (f.type === 'date' && body[f.key])
          body[f.key] = new Date(String(body[f.key])).toISOString();
      if (editing) await patch(`/admin/${resource}/${editing.id}`, body);
      else await post(`/admin/${resource}`, body);
      toast.success('Đã lưu thay đổi');
      setEditing(undefined);
      await queryClient.invalidateQueries({
        queryKey: ['admin-resource', resource],
      });
      await queryClient.invalidateQueries({ queryKey: ['content'] });
      await queryClient.invalidateQueries({ queryKey: [resource] });
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
          <span className="eyebrow">QUẢN LÝ CỬA HÀNG</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {config.canCreate && (
          <button className="btn" onClick={() => edit(null)}>
            <Plus size={17} />
            Thêm {config.singular}
          </button>
        )}
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
              aria-label="Tìm dữ liệu"
              placeholder={`Tìm ${config.singular}…`}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
          <button className="btn secondary small">Tìm kiếm</button>
          <select
            aria-label="Sắp xếp dữ liệu"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Thứ tự mặc định</option>
            <option value="newest">Mới tạo trước</option>
            <option value="oldest">Tạo trước lên đầu</option>
          </select>
          <span>{list.data?.total || 0} kết quả</span>
        </form>
        {list.isLoading ? (
          <Loading />
        ) : list.isError ? (
          <ErrorState retry={() => void list.refetch()} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {config.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((row) => (
                    <tr key={row.id}>
                      {config.columns.map((c) => (
                        <td key={c.key} title={String(nested(row, c.key) ?? '')}>
                          {renderValue(nested(row, c.key), c.key)}
                        </td>
                      ))}
                      <td>
                        <div className="table-actions">
                          <button
                            aria-label={`Sửa ${config.singular} ${row.id}`}
                            onClick={() => edit(row)}
                          >
                            <Pencil size={16} />
                          </button>
                          {resource === 'customers' && (
                            <Link title="Xem hồ sơ và đơn hàng" to={`/admin/customers/${row.id}`}>
                              <ExternalLink size={16} />
                            </Link>
                          )}
                          {config.canDelete && (
                            <button
                              aria-label={`Xóa hoặc ẩn ${config.singular} ${row.id}`}
                              onClick={() => setDeleting(row)}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!list.data?.items.length && <p className="empty">Chưa có dữ liệu phù hợp.</p>}
            <Pagination page={page} pages={list.data?.pages || 0} onChange={setPage} />
          </>
        )}
      </div>
      {editing !== undefined && (
        <Modal
          wide
          title={`${editing ? 'Chỉnh sửa' : 'Thêm'} ${config.singular}`}
          onClose={() => setEditing(undefined)}
        >
          {editing && ['contacts', 'reviews', 'customers'].includes(resource) && (
            <div className="notice">
              <p>{String(editing.message || editing.content || editing.email || '')}</p>
            </div>
          )}
          <form className="form-stack" onSubmit={save}>
            <div className="form-grid">
              {config.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={values[f.key]}
                  onChange={(v) => setValues((old) => ({ ...old, [f.key]: v }))}
                />
              ))}
            </div>
            <div className="button-row">
              <button className="btn secondary" type="button" onClick={() => setEditing(undefined)}>
                Đóng
              </button>
              <button className="btn" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title={`Xác nhận xóa / ẩn ${config.singular}`} onClose={() => setDeleting(null)}>
          <p>
            Dữ liệu đang được tham chiếu sẽ được bảo toàn bằng cách ngừng hiển thị. Banner và FAQ sẽ
            được xóa.
          </p>
          <div className="button-row">
            <button className="btn secondary" onClick={() => setDeleting(null)}>
              Giữ lại
            </button>
            <button
              className="btn danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await remove(`/admin/${resource}/${deleting.id}`);
                  await list.refetch();
                  await queryClient.invalidateQueries({
                    queryKey: ['content'],
                  });
                  await queryClient.invalidateQueries({ queryKey: [resource] });
                  setDeleting(null);
                  toast.success('Đã cập nhật dữ liệu');
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xác nhận
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
