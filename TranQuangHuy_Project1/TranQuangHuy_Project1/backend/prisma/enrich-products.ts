import 'dotenv/config';
import {PrismaClient} from '@prisma/client';
import {buildDemoProductProfile} from './product-profiles.js';
if(process.env.DEMO_MODE!=='true'||process.env.NODE_ENV==='production')throw Error('Chỉ nâng cấp dữ liệu mô phỏng trong môi trường demo.');
const db=new PrismaClient();
try{
 const products=await db.product.findMany({where:{sku:{startsWith:'HD-'}},include:{category:true,brand:true}});let updated=0;
 for(const p of products){if(p.details!==null||!/^HD-\d{5}$/.test(p.sku)||!p.description.includes('thuộc bộ sưu tập dinh dưỡng HDbaby'))continue;
 const profile=buildDemoProductProfile({category:p.category.slug,brand:p.brand.name,age:p.age,index:Number(p.sku.slice(3))-1});
 await db.product.update({where:{id:p.id},data:profile});updated++;}
 console.log(JSON.stringify({updated,skipped:products.length-updated,message:'Giữ nguyên giá, tồn kho, slug và lịch sử đơn hàng.'}));
}finally{await db.$disconnect();}
