# Khởi động trên máy Windows khác

Lỗi `Không khởi động được MySQL` nghĩa là MySQL riêng tại cổng 3307 chưa sẵn sàng. Dòng stack trace chưa cho biết nguyên nhân. Đọc log trên máy bị lỗi:

```powershell
Get-Content .\.runtime\mysql.log -Tail 40
```

Không gửi `backend/.env` hoặc `.runtime/database.json` vì có mật khẩu. Không xóa thư mục dữ liệu để thử sửa lỗi.

Đã tái hiện lỗi trên Windows với `spawn(..., {detached: true})`: `mysqld --console` thoát code 1 trước khi ghi log. Bản sửa dùng `detached: false`, giữ `windowsHide: true`, chuyển stdout/stderr vào log và `unref()` sau khi tạo tiến trình. Đã kiểm tra dừng/khởi động lại MySQL 8.0.44 thành công. Với máy khác vẫn cần xem thông báo thực tế để xác nhận có cùng nguyên nhân.

## Chuẩn bị máy mới

Dùng Node 22.13+ hoặc 24 LTS và **MySQL Server 8**. Node 26 trong ảnh chưa được dự án kiểm thử, nhưng ảnh không đủ cơ sở kết luận Node là nguyên nhân. XAMPP thường cung cấp MariaDB; dự án dùng MySQL 8.

Giải nén `output/HDbaby-source.zip` vào một thư mục mới. Zip không mang theo `.runtime`, `backend/.env`, `node_modules` của máy cũ. Chạy:

```powershell
npm.cmd install
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Nếu MySQL nằm ngoài vị trí cài thông thường, đặt đường dẫn chứa cả `mysqld.exe` và `mysql.exe` trong cùng cửa sổ PowerShell:

```powershell
$env:MYSQL_BIN = 'D:\MySQL\bin'
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

## Đọc nguyên nhân

### Failed to find valid data directory

`MY-010111` cùng `MY-010020 Data Dictionary initialization failed` cho biết datadir của dự án chưa hợp lệ. Có thể khởi tạo dở hoặc sao chép thiếu dữ liệu. Có riêng thư mục con `mysql` chưa đủ chứng minh hoàn tất khởi tạo. Script mới kiểm tra thêm các file hệ thống `ibdata1`, `mysql.ibd`; đây là kiểm tra thiếu file, không phải kiểm tra toàn vẹn hoặc phục hồi dữ liệu.

Nếu máy mới chỉ cần bộ dữ liệu demo, mở PowerShell ở thư mục có `package.json`, dừng API/frontend nếu đang chạy, rồi thực hiện:

```powershell
$ErrorActionPreference = 'Stop'
$backupTag = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
if (Test-Path -LiteralPath '.runtime') { Rename-Item -LiteralPath '.runtime' -NewName ".runtime-backup-$backupTag" }
if (Test-Path -LiteralPath 'backend/.env') { Move-Item -LiteralPath 'backend/.env' -Destination ".\.env-backup-$backupTag" }
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

Hai bản cũ được giữ ở thư mục gốc; website mới dùng database demo mới. Không đổi tên/xóa thư mục MySQL trong Program Files hoặc ProgramData. Nếu `.runtime` báo đang được sử dụng, dừng tại đó, không ép xóa. Nếu cần giữ các đơn hoặc sản phẩm đã tự nhập, giữ bản sao cũ và phục hồi/xuất SQL từ máy nguồn; dữ liệu đó không tự xuất hiện trong database demo mới.

### Các dấu hiệu khác

| Dấu hiệu                                                               | Cách xử lý                                                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `ENOENT`, không tìm thấy MySQL                                         | Cài MySQL Server 8 hoặc chỉnh `MYSQL_BIN` đúng thư mục `bin`.                                                                             |
| `Bind on TCP/IP port`, `10048`, cổng 3307 bị dùng                      | Kiểm tra `Get-NetTCPConnection -LocalPort 3307`. Không dừng dịch vụ chưa xác định. Có thể cấu hình database MySQL riêng theo README.      |
| `Access denied`, xác thực không khớp                                   | Có thể đã sao chép `.env`/`.runtime` không đồng bộ hoặc kết nối nhầm MySQL. Giữ nguyên bản cũ; thử source sạch trong thư mục mới.         |
| `Data Dictionary`, `upgrade`, `downgrade`, phiên bản không tương thích | Không mở cùng datadir bằng phiên bản MySQL khác. Dùng đúng phiên bản nguồn để xuất SQL rồi nhập vào database máy mới nếu cần giữ dữ liệu. |
| `Permission denied`, `Can't create/write`, `OS errno 5`                | Chọn thư mục có quyền ghi; kiểm tra phần mềm bảo vệ đang chặn `mysqld.exe`.                                                               |
| Thiếu `VCRUNTIME`/`MSVCP`, tiến trình thoát ngay                       | Cài thành phần Microsoft Visual C++ Runtime theo trình cài MySQL.                                                                         |

Nếu không có log, kiểm tra đường dẫn MySQL trước:

```powershell
Get-ChildItem 'C:\Program Files\MySQL' -Directory | Select-Object -ExpandProperty FullName
```

Để giữ dữ liệu đã nhập trên máy cũ, chuyển bằng bản dump SQL từ MySQL đang chạy; không chép datadir đang hoạt động. Dữ liệu mẫu mới được tạo khi setup source sạch.

## Nâng cấp bản đã có dữ liệu

Giữ MySQL chạy, dừng API trước khi generate Prisma trên Windows:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:enrich
```

`db:enrich` chỉ bổ sung hồ sơ cho sản phẩm seed cũ chưa có hồ sơ; giữ giá, tồn kho, đơn hàng và sản phẩm đã chỉnh sửa.
