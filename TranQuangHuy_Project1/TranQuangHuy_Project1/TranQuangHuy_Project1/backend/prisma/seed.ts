import 'dotenv/config';
import { PrismaClient, OrderStatus, type Product } from '@prisma/client';
import { fakerVI as faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import {buildDemoProductProfile} from './product-profiles.js';
const db = new PrismaClient();
faker.seed(20261101);
if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true')
  throw Error('Seed chỉ chạy khi DEMO_MODE=true và không phải production');
const ago = (days: number) => new Date(Date.now() - days * 86400000);
const categories = [
  'Sữa công thức',
  'Bột ăn dặm',
  'Cháo & thực phẩm ăn dặm',
  'Bánh ăn dặm',
  'Ngũ cốc',
  'Thực phẩm bổ sung',
  'Đồ uống dinh dưỡng',
  'Combo dinh dưỡng',
];
const slugs = [
  'sua-cong-thuc',
  'bot-an-dam',
  'chao-an-dam',
  'banh-an-dam',
  'ngu-coc',
  'thuc-pham-bo-sung',
  'do-uong-dinh-duong',
  'combo-dinh-duong',
];
const brands = [
  'HDbaby',
  'Little Organics',
  'Mầm Nhỏ',
  'Happy Sprout',
  'Bé An',
  'Tiny Garden',
  'Mộc Baby',
  'Sunny Kids',
  'Nori Baby',
  'Petit Bloom',
  'Oat & Love',
  'Bunny Care',
];
const prefixes = [
  'Dinh dưỡng công thức',
  'Bột gạo ăn dặm',
  'Cháo rau củ',
  'Bánh gạo ăn dặm',
  'Ngũ cốc yến mạch',
  'Bổ sung vi chất',
  'Thức uống dinh dưỡng',
  'Combo khởi đầu',
];
const flavors = [
  'vị nguyên bản',
  'vị bí đỏ',
  'vị táo',
  'vị chuối',
  'vị cà rốt',
  'vị lúa mạch',
  'vị khoai lang',
  'vị lê',
];
const ages = ['0-6', '6-12', '12-24', '24-36', '36+'];
const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
async function seed() {
  const existing = await db.product.count();
  if (existing >= 150 && (await db.order.count()) >= 250) {
    console.log(
      'Dữ liệu demo đã tồn tại; seed giữ nguyên dữ liệu hiện có. Dùng db:reset nếu muốn khởi tạo lại toàn bộ database dự án.',
    );
    return;
  }
  if (existing > 0)
    throw Error(
      'Database đã có dữ liệu chưa đủ bộ seed. Không ghi đè. Dùng database trống hoặc db:reset nếu chủ động muốn xóa dữ liệu dự án.',
    );
  const [adminHash, customerHash] = await Promise.all([
    bcrypt.hash('Admin@123456', 12),
    bcrypt.hash('Customer@123456', 12),
  ]);
  await db.user.create({
    data: {
      email: 'admin@hdbaby.local',
      name: 'Quản trị HDbaby',
      phone: '0901234567',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  const customers = [];
  for (let i = 0; i < 50; i++) {
    const user = await db.user.create({
      data: {
        email: i === 0 ? 'customer@hdbaby.local' : `ba.me.${i}@example.test`,
        name: i === 0 ? 'Nguyễn Hải Đăng' : faker.person.fullName(),
        phone: `09${String(10000000 + i).padStart(8, '0')}`,
        passwordHash: customerHash,
        createdAt: ago(faker.number.int({ min: 5, max: 180 })),
      },
    });
    customers.push(user);
  }
  for (let i = 0; i < 70; i++)
    await db.address.create({
      data: {
        userId: customers[i % 50].id,
        name: customers[i % 50].name,
        phone: customers[i % 50].phone,
        city: i % 2 ? 'Hà Nội' : 'TP. Hồ Chí Minh',
        district: i % 2 ? 'Cầu Giấy' : 'Bình Thạnh',
        detail: `${12 + i} Đường ${i % 2 ? 'Hoa Mai' : 'Nguyễn Hữu Cảnh'}, phường ${i % 2 ? 'Dịch Vọng' : '22'}`,
        isDefault: i < 50,
      },
    });
  for (let i = 0; i < 8; i++)
    await db.category.create({
      data: {
        name: categories[i],
        slug: slugs[i],
        image: `/assets/product-${i}.webp`,
        position: i,
      },
    });
  for (let i = 0; i < 12; i++)
    await db.brand.create({
      data: {
        name: brands[i],
        slug: slugify(brands[i]),
        origin: ['Việt Nam', 'Nhật Bản', 'Úc', 'New Zealand'][i % 4],
        position: i,
      },
    });
  const cats = await db.category.findMany({ orderBy: { id: 'asc' } });
  const brandRows = await db.brand.findMany({ orderBy: { id: 'asc' } });
  const products: Product[] = [];
  for (let i = 0; i < 150; i++) {
    const c = i % 8;
    const price =
      [485000, 159000, 65000, 89000, 185000, 245000, 45000, 529000][c] + Math.floor(i / 8) * 5000;
    const sale = i % 3 === 0;
    const name = `${prefixes[c]} ${brands[i % 12]} ${flavors[Math.floor(i / 8) % 8]} ${[400, 600, 800][i % 3]}${c === 6 ? 'ml' : 'g'}`;
    const p = await db.product.create({
      data: {
        name,
        slug: `${slugify(name)}-${i + 1}`,
        sku: `HD-${String(i + 1).padStart(5, '0')}`,
        categoryId: cats[c].id,
        brandId: brandRows[i % 12].id,
        age: c === 0 ? ages[Math.floor(i / 8) % 5] : ages[1 + (Math.floor(i / 8) % 4)],
        price,
        originalPrice: sale ? Math.round(price / 0.85 / 1000) * 1000 : null,
        stock: i % 17 === 0 ? 0 : i % 13 === 0 ? 5 : 150 + faker.number.int({ min: 0, max: 250 }),
        featured: i < 16,
        description: `${name} thuộc bộ sưu tập dinh dưỡng HDbaby. Bao bì và thông tin được xây dựng riêng cho đồ án. Lựa chọn đúng độ tuổi ghi trên nhãn và đọc kỹ hướng dẫn trước khi sử dụng. Đây là sản phẩm minh họa, không phải hàng hóa đang phân phối thực tế.`,
        ingredients:
          'Dữ liệu nhãn mô phỏng: nguyên liệu ngũ cốc, trái cây và các thành phần theo loại sản phẩm. Kiểm tra dị ứng theo nhãn thực tế.',
        nutrition: 'Dữ liệu minh họa cho đồ án; không phải công bố dinh dưỡng hoặc tư vấn y tế.',
        usage:
          'Dùng dụng cụ sạch. Đọc hướng dẫn trên bao bì thực tế, chuẩn bị lượng vừa đủ và sử dụng ngay sau khi chế biến.',
        storage: 'Để nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Đóng kín sau khi mở.',
        warning:
          'Dữ liệu demo. Không có tác dụng điều trị bệnh. Đọc nhãn thực tế và hỏi chuyên gia khi cần lựa chọn dinh dưỡng phù hợp.',
        packaging: `${[400, 600, 800][i % 3]}${c === 6 ? 'ml' : 'g'}`,
        origin: brandRows[i % 12].origin,
        ...buildDemoProductProfile({category:slugs[c],brand:brands[i%12],age:c===0?ages[Math.floor(i/8)%5]:ages[1+Math.floor(i/8)%4],index:i}),
        createdAt: ago(faker.number.int({ min: 0, max: 120 })),
        images: {
          create: [
            { url: `/assets/product-${c}.webp`, position: 0 },
            { url: `/assets/product-${c}-detail.webp`, position: 1 },
          ],
        },
      },
    });
    products.push(p);
  }
  for (let i = 0; i < 15; i++)
    await db.voucher.create({
      data: {
        code: i === 0 ? 'HELLOBABY' : i === 1 ? 'HDBABY50' : `BABY${i + 1}DEMO`,
        type: i % 2 ? 'FIXED' : 'PERCENT',
        value: i % 2 ? 50000 : 10,
        maxDiscount: 100000,
        minOrder: 199000,
        startsAt: ago(30),
        expiresAt: new Date(Date.now() + 365 * 86400000),
        limit: 500,
        perUser: 5,
        active: i !== 14,
      },
    });
  const orderStatuses: OrderStatus[] = [
    'COMPLETED',
    'COMPLETED',
    'COMPLETED',
    'PENDING',
    'CONFIRMED',
    'SHIPPING',
    'CANCELLED',
  ];
  const reviews: string[] = [
    'Bao bì dễ thương, đóng gói cẩn thận. Đây là nhận xét minh họa phục vụ kiểm thử đồ án.',
    'Giao hàng đúng thông tin đã xác nhận. Nội dung đánh giá này là dữ liệu demo.',
    'Thông tin sản phẩm trình bày rõ ràng, dễ theo dõi đơn hàng. Nhận xét mẫu cho đồ án.',
  ];
  let reviewCount = 0;
  let inventoryCount = 0;
  for (let i = 0; i < 250; i++) {
    const user = customers[i % 50];
    const status = orderStatuses[i % 7];
    const indices = [i % 150, (i + 37) % 150, (i + 73) % 150];
    const items = indices.map((index, j) => ({
      productId: products[index].id,
      name: products[index].name,
      sku: products[index].sku,
      image: `/assets/product-${index % 8}.webp`,
      quantity: j === 0 ? 2 : 1,
      price: products[index].price,
    }));
    const subtotal = items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);
    const shipping = subtotal >= 499000 ? 0 : 25000;
    const date = ago(faker.number.int({ min: 0, max: 179 }));
    const historyStatuses: OrderStatus[] =
      status === 'CANCELLED'
        ? ['PENDING', 'CANCELLED']
        : (['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'] as OrderStatus[]).slice(
            0,
            (['PENDING', 'CONFIRMED', 'SHIPPING', 'COMPLETED'] as OrderStatus[]).indexOf(status) +
              1,
          );
    const order = await db.order.create({
      data: {
        code: `HD-DEMO-${String(i + 1).padStart(4, '0')}`,
        userId: user.id,
        idempotencyKey: `seed:${i}`,
        requestHash: 'seed',
        status,
        subtotal,
        shipping,
        discount: 0,
        total: subtotal + shipping,
        recipient: user.name,
        phone: user.phone,
        city: 'TP. Hồ Chí Minh',
        district: 'Bình Thạnh',
        address: `${i + 10} Nguyễn Hữu Cảnh`,
        note: 'Giao dịch mẫu của đồ án, không phát sinh thanh toán thật.',
        delivery: 'standard',
        payment: i % 2 ? 'COD' : 'BANK_DEMO',
        paymentStatus: status === 'COMPLETED' ? 'PAID' : 'UNPAID',
        createdAt: date,
        items: { create: items },
        history: {
          create: historyStatuses.map((s, j) => ({
            status: s,
            note: 'Lịch sử giao dịch mẫu',
            createdAt: new Date(date.getTime() + j * 1000),
          })),
        },
      },
    });
    for (const it of items) {
      if (status !== 'CANCELLED') {
        await db.product.update({
          where: { id: it.productId },
          data: { sold: { increment: it.quantity } },
        });
      }
      if (status === 'COMPLETED' && reviewCount < 300) {
        await db.review.create({
          data: {
            userId: user.id,
            productId: it.productId,
            orderId: order.id,
            rating: 4 + (i % 2),
            content: reviews[reviewCount % 3],
            createdAt: date,
          },
        });
        reviewCount++;
      }
    }
  }
  // Record opening stock so every initial unit is accounted for. Seed historical orders consumed earlier stock.
  for (const p of products) {
    const sold = (await db.product.findUniqueOrThrow({ where: { id: p.id } })).sold;
    await db.inventoryLog.create({
      data: {
        productId: p.id,
        change: p.stock + sold,
        reason: 'Tồn đầu kỳ dữ liệu minh họa',
        actor: 'seed',
        createdAt: ago(181),
      },
    });
    inventoryCount++;
    const orders = await db.orderItem.findMany({
      where: { productId: p.id, order: { status: { not: 'CANCELLED' } } },
      include: { order: { select: { createdAt: true, code: true } } },
    });
    for (const it of orders) {
      await db.inventoryLog.create({
        data: {
          productId: p.id,
          change: -it.quantity,
          reason: `Xuất ${it.order.code}`,
          actor: 'seed',
          createdAt: it.order.createdAt,
        },
      });
      inventoryCount++;
    }
    const avg = await db.review.aggregate({
      where: { productId: p.id },
      _avg: { rating: true },
    });
    await db.product.update({
      where: { id: p.id },
      data: { rating: avg._avg.rating || 0 },
    });
  }
  const bannerTitles = [
    'Yêu thương từ những điều nhỏ nhất',
    'Khởi đầu nhỏ, yêu thương lớn',
    'Bữa ăn vui, bé thêm háo hức',
    'Chọn điều lành, dành cho bé',
    'Cùng ba mẹ, mỗi ngày lớn khôn',
    'Khám phá thế giới ăn dặm',
    'Một chút quan tâm, thật nhiều yêu thương',
    'Món quà cho hành trình đầu đời',
  ];
  for (let i = 0; i < 8; i++)
    await db.banner.create({
      data: {
        title: bannerTitles[i],
        subtitle: 'Cùng HDbaby chăm chút từng bữa ăn, đồng hành cùng những cột mốc đầu đời của bé.',
        image: '/assets/hero.webp',
        link: `/products?category=${slugs[i]}`,
        position: i,
      },
    });
  const titles = [
    'Bắt đầu hành trình ăn dặm: những điều ba mẹ cần chuẩn bị',
    'Cách đọc nhãn và bảo quản sản phẩm dinh dưỡng',
    'Để mỗi bữa ăn là một khoảnh khắc kết nối',
    'Sắp xếp góc ăn dặm gọn gàng cho bé',
    'Danh sách đồ dùng cho bữa ăn đầu tiên',
    'Hiểu đúng thông tin độ tuổi trên bao bì',
    'Bảo quản thực phẩm sau khi mở nắp',
    'Tạo thói quen rửa tay trước bữa ăn',
    'Đọc hạn sử dụng và mã lô sản phẩm',
    'Lưu ý khi lựa chọn dụng cụ ăn dặm',
    'Chuẩn bị bữa ăn khi đi du lịch',
    'Gợi ý ghi chép lịch sinh hoạt của bé',
    'Giữ không gian bữa ăn thoải mái',
    'Kiểm tra bao bì trước khi mua hàng',
    'Chọn mua sản phẩm từ nguồn tin cậy',
    'Các ký hiệu thường gặp trên nhãn',
    'Vệ sinh bàn ghế sau bữa ăn',
    'Tổ chức tủ thực phẩm gia đình',
    'Cùng ba mẹ khám phá hương vị mới',
    'Lên danh sách mua sắm hàng tuần',
  ];
  for (let i = 0; i < 20; i++)
    await db.article.create({
      data: {
        title: titles[i],
        slug: slugify(titles[i]),
        excerpt:
          'Những gợi ý gần gũi giúp ba mẹ chuẩn bị chu đáo hơn cho hành trình chăm sóc bé mỗi ngày.',
        content: `${titles[i]}\n\nMỗi gia đình có nhịp sinh hoạt riêng. Ba mẹ có thể bắt đầu từ những việc nhỏ: chuẩn bị không gian sạch sẽ, đọc kỹ nhãn và dành thời gian quan sát phản ứng của bé.\n\nChuẩn bị chu đáo\n\nKiểm tra hạn sử dụng, độ nguyên vẹn của bao bì, hướng dẫn bảo quản và thông tin độ tuổi. Dùng dụng cụ sạch và tránh để sản phẩm đã mở quá thời gian khuyến nghị trên nhãn.\n\nĐồng hành cùng bé\n\nGiữ không khí bữa ăn thoải mái. Nếu có thắc mắc về nhu cầu dinh dưỡng, dị ứng hay sức khỏe của bé, hãy trao đổi với bác sĩ hoặc chuyên gia có chuyên môn.\n\nBài viết minh họa phục vụ đồ án HDbaby, không thay thế tư vấn y tế và không khuyến nghị điều trị.`,
        image: i % 2 ? '/assets/hero.webp' : `/assets/product-${i % 8}.webp`,
        createdAt: ago(i * 3),
      },
    });
  const faqs = [
    [
      'HDbaby có phải cửa hàng đang bán hàng thật không?',
      'Đây là website đồ án. Sản phẩm, giao dịch và đánh giá đều là dữ liệu minh họa.',
    ],
    [
      'Đơn hàng được giao trong bao lâu?',
      'Chính sách demo: giao tiêu chuẩn 2–4 ngày, giao nhanh 1–2 ngày. Không có vận chuyển thực tế.',
    ],
    [
      'Làm thế nào để sử dụng mã ưu đãi?',
      'Nhập HELLOBABY tại bước thông tin nhận hàng. Hệ thống kiểm tra giá trị đơn, hạn và số lượt sử dụng.',
    ],
    [
      'Tôi có thể hủy đơn khi nào?',
      'Bạn có thể hủy đơn đang chờ xác nhận hoặc đã xác nhận. Hệ thống tự hoàn kho đúng một lần.',
    ],
    [
      'Thông tin dinh dưỡng có phải dữ liệu chính thức?',
      'Thông tin và bao bì được mô phỏng cho đồ án. Khi sử dụng sản phẩm thật, cần đọc nhãn chính thức.',
    ],
  ];
  for (let i = 0; i < faqs.length; i++)
    await db.faq.create({
      data: { question: faqs[i][0], answer: faqs[i][1], position: i },
    });
  const settings = {
    name: 'HDbaby',
    phone: '1900 6886',
    email: 'hello@hdbaby.local',
    address: '123 Nguyễn Hữu Cảnh, Bình Thạnh, TP. Hồ Chí Minh (địa chỉ demo)',
    about:
      'HDbaby được xây dựng với mong muốn đồng hành cùng ba mẹ trong những năm tháng đầu đời của bé. Chúng mình tin rằng sự quan tâm bắt đầu từ những lựa chọn nhỏ, từ một bữa ăn được chuẩn bị chu đáo đến những khoảnh khắc gia đình ở bên nhau. Đây là dự án tốt nghiệp, toàn bộ sản phẩm và giao dịch là dữ liệu minh họa.',
    shippingPolicy:
      'Chính sách demo: giao tiêu chuẩn 25.000đ, miễn phí với đơn từ 499.000đ; giao nhanh 45.000đ. Thời gian dự kiến 2–4 ngày với tiêu chuẩn, 1–2 ngày với giao nhanh. Không phát sinh vận chuyển thực tế.',
    returnPolicy:
      'Chính sách minh họa: tiếp nhận yêu cầu đổi trả trong 7 ngày khi sản phẩm lỗi bao bì hoặc giao sai. Liên hệ qua biểu mẫu để được ghi nhận. Đơn đang chờ hoặc đã xác nhận có thể hủy trong tài khoản.',
    privacyPolicy:
      'Dữ liệu tài khoản chỉ sử dụng để vận hành đồ án: đăng nhập, giao hàng mô phỏng và lịch sử mua hàng. Mật khẩu được băm. Không thu thập thông tin sức khỏe của trẻ. Không nhập thông tin cá nhân nhạy cảm khi sử dụng bản demo.',
  };
  for (const [key, value] of Object.entries(settings))
    await db.setting.create({ data: { key, value } });
  for (let i = 0; i < 100; i++)
    await db.notification.create({
      data: {
        userId: customers[i % 50].id,
        title: i % 2 ? 'Chào mừng đến với HDbaby' : 'Cập nhật đơn hàng demo',
        content: 'Theo dõi hành trình mua sắm của bạn trong tài khoản HDbaby. Dữ liệu minh họa.',
        createdAt: ago(i % 30),
      },
    });
  for (let i = 0; i < 5; i++)
    await db.contact.create({
      data: {
        name: customers[i].name,
        email: customers[i].email,
        message:
          'Mình muốn tìm hiểu chính sách giao hàng và cách sử dụng mã ưu đãi trong bản demo.',
      },
    });
  console.log(
    JSON.stringify({
      categories: 8,
      brands: 12,
      products: 150,
      customers: 50,
      addresses: 70,
      orders: 250,
      reviews: reviewCount,
      vouchers: 15,
      banners: 8,
      articles: 20,
      notifications: 100,
      inventoryLogs: inventoryCount,
    }),
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
