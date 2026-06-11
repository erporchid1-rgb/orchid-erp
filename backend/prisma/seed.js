const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Users ────────────────────────────────────────────────────────────────────
  const pass = (p) => bcrypt.hash(p, 12);

  const users = [
    { email: 'admin@orchidconstruction.com',        name: 'System Admin',         role: 'ADMIN',              password: await pass('Admin@123'),       mobile: '9876543210', department: null },
    { email: 'md@orchidconstruction.com',           name: 'Vikram Mehta',         role: 'MD',                 password: await pass('Md@123'),          mobile: '9876543220', department: null },
    { email: 'director@orchidconstruction.com',     name: 'Suresh Gupta',         role: 'EXE_DIRECTOR',       password: await pass('Director@123'),    mobile: '9876543221', department: null },
    { email: 'president@orchidconstruction.com',    name: 'Anand Verma',          role: 'PRESIDENT_PROJECTS', password: await pass('President@123'),   mobile: '9876543222', department: 'Projects' },
    { email: 'cfo@orchidconstruction.com',          name: 'Neha Agarwal',         role: 'CFO',                password: await pass('Cfo@123'),         mobile: '9876543223', department: 'Finance' },
    { email: 'gm.purchase@orchidconstruction.com',  name: 'Deepak Joshi',         role: 'GM_PURCHASE',        password: await pass('GmPurchase@123'),  mobile: '9876543224', department: 'Purchase' },
    { email: 'purchase.hod@orchidconstruction.com', name: 'Rahul Singh',          role: 'PURCHASE_HOD',       password: await pass('PurchaseHod@123'), mobile: '9876543225', department: 'Purchase' },
    { email: 'user.hod@orchidconstruction.com',     name: 'Sanjay Mishra',        role: 'USER_HOD',           password: await pass('UserHod@123'),     mobile: '9876543226', department: 'Engineering' },
    { email: 'incharge@orchidconstruction.com',     name: 'Mohan Yadav',          role: 'INCHARGE',           password: await pass('Incharge@123'),    mobile: '9876543227', department: 'Civil' },
    { email: 'store@orchidconstruction.com',        name: 'Rajesh Kumar',         role: 'STORE_MANAGER',      password: await pass('Store@123'),       mobile: '9876543211', department: 'Store' },
    { email: 'finance@orchidconstruction.com',      name: 'Kavita Sharma',        role: 'FINANCE',            password: await pass('Finance@123'),     mobile: '9876543228', department: 'Finance' },
    { email: 'accountant@orchidconstruction.com',   name: 'Priya Patel',          role: 'ACCOUNTANT',         password: await pass('Account@123'),     mobile: '9876543213', department: 'Finance' },
    { email: 'engineer@orchidconstruction.com',     name: 'Amit Sharma',          role: 'SITE_ENGINEER',      password: await pass('Engineer@123'),    mobile: '9876543212', department: 'Engineering' },
  ];

  for (const u of users) {
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, status: 'ACTIVE' } });
  }

  // ── Categories ───────────────────────────────────────────────────────────────
  const categoryData = [
    { name: 'Cement & Concrete',    description: 'Cement, concrete mix, ready mix, admixtures' },
    { name: 'Steel & Iron',         description: 'TMT bars, structural steel, MS plates, angles' },
    { name: 'Bricks & Blocks',      description: 'Red bricks, fly ash bricks, AAC blocks, concrete blocks' },
    { name: 'Sand & Aggregate',     description: 'River sand, M-sand, coarse aggregate, gravel, stone dust' },
    { name: 'Tiles & Flooring',     description: 'Floor tiles, wall tiles, marble, granite, vitrified tiles' },
    { name: 'Electrical',           description: 'Wires, cables, switches, boards, conduits, MCBs, fans, lights' },
    { name: 'Plumbing & Sanitary',  description: 'Pipes, fittings, valves, taps, basins, toilets, water tanks' },
    { name: 'Paint & Chemicals',    description: 'Primer, emulsion, enamel, putty, thinner, waterproof coating' },
    { name: 'Wood & Timber',        description: 'Shuttering ply, flush doors, frames, battens, hardwood' },
    { name: 'Glass & Aluminium',    description: 'Window glass, aluminium sections, UPVC, partitions' },
    { name: 'Waterproofing',        description: 'Waterproof membrane, crystalline compound, bitumen, sealants' },
    { name: 'Hardware & Fasteners', description: 'Bolts, nuts, screws, nails, hinges, locks, anchors' },
    { name: 'Safety Equipment',     description: 'Helmets, gloves, safety shoes, harness, nets, signage' },
    { name: 'Tools & Equipment',    description: 'Hand tools, power tools, scaffolding, shuttering material' },
    { name: 'Finishing Materials',  description: 'Gypsum, POP, false ceiling, skirting, grouts, adhesives' },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({ where: { name: cat.name }, update: {}, create: cat });
  }

  const cats = await prisma.category.findMany();
  const cat = (name) => cats.find(c => c.name === name).id;

  // ── Materials ────────────────────────────────────────────────────────────────
  const materials = [
    // Cement & Concrete
    { materialName: 'OPC Cement 53 Grade',       categoryId: cat('Cement & Concrete'),    unit: 'Bag',   minimumStock: 500,  hsnCode: '2523' },
    { materialName: 'PPC Cement',                categoryId: cat('Cement & Concrete'),    unit: 'Bag',   minimumStock: 200,  hsnCode: '2523' },
    { materialName: 'Ready Mix Concrete M25',    categoryId: cat('Cement & Concrete'),    unit: 'CUM',   minimumStock: 10,   hsnCode: '3824' },
    { materialName: 'Concrete Admixture',        categoryId: cat('Cement & Concrete'),    unit: 'Ltr',   minimumStock: 50 },
    // Steel & Iron
    { materialName: 'TMT Bar 8mm',               categoryId: cat('Steel & Iron'),         unit: 'KG',    minimumStock: 2000, hsnCode: '7214' },
    { materialName: 'TMT Bar 10mm',              categoryId: cat('Steel & Iron'),         unit: 'KG',    minimumStock: 3000, hsnCode: '7214' },
    { materialName: 'TMT Bar 12mm',              categoryId: cat('Steel & Iron'),         unit: 'KG',    minimumStock: 3000, hsnCode: '7214' },
    { materialName: 'TMT Bar 16mm',              categoryId: cat('Steel & Iron'),         unit: 'KG',    minimumStock: 2000, hsnCode: '7214' },
    { materialName: 'Binding Wire',              categoryId: cat('Steel & Iron'),         unit: 'KG',    minimumStock: 100 },
    // Bricks & Blocks
    { materialName: 'Fly Ash Brick',             categoryId: cat('Bricks & Blocks'),      unit: 'Nos',   minimumStock: 5000, hsnCode: '6901' },
    { materialName: 'AAC Block 200mm',           categoryId: cat('Bricks & Blocks'),      unit: 'CUM',   minimumStock: 20,   hsnCode: '6808' },
    { materialName: 'Solid Concrete Block',      categoryId: cat('Bricks & Blocks'),      unit: 'Nos',   minimumStock: 1000 },
    // Sand & Aggregate
    { materialName: 'River Sand',                categoryId: cat('Sand & Aggregate'),     unit: 'CUM',   minimumStock: 50,   hsnCode: '2505' },
    { materialName: 'M-Sand',                    categoryId: cat('Sand & Aggregate'),     unit: 'CUM',   minimumStock: 50,   hsnCode: '2517' },
    { materialName: 'Coarse Aggregate 20mm',     categoryId: cat('Sand & Aggregate'),     unit: 'CUM',   minimumStock: 30,   hsnCode: '2517' },
    { materialName: 'Coarse Aggregate 10mm',     categoryId: cat('Sand & Aggregate'),     unit: 'CUM',   minimumStock: 20,   hsnCode: '2517' },
    // Tiles & Flooring
    { materialName: 'Vitrified Floor Tile 600x600', categoryId: cat('Tiles & Flooring'), unit: 'SQM',   minimumStock: 100 },
    { materialName: 'Wall Tile 300x600',         categoryId: cat('Tiles & Flooring'),     unit: 'SQM',   minimumStock: 50 },
    { materialName: 'Granite Slab 18mm',         categoryId: cat('Tiles & Flooring'),     unit: 'SQM',   minimumStock: 30 },
    // Electrical
    { materialName: 'FR Wire 1.5 sqmm',          categoryId: cat('Electrical'),           unit: 'Mtr',   minimumStock: 500,  hsnCode: '8544' },
    { materialName: 'FR Wire 2.5 sqmm',          categoryId: cat('Electrical'),           unit: 'Mtr',   minimumStock: 500,  hsnCode: '8544' },
    { materialName: 'FR Wire 4 sqmm',            categoryId: cat('Electrical'),           unit: 'Mtr',   minimumStock: 200,  hsnCode: '8544' },
    { materialName: 'MCB 32A Single Pole',       categoryId: cat('Electrical'),           unit: 'Nos',   minimumStock: 20 },
    { materialName: 'PVC Conduit 25mm',          categoryId: cat('Electrical'),           unit: 'Mtr',   minimumStock: 200 },
    // Plumbing & Sanitary
    { materialName: 'CPVC Pipe 0.5 inch',        categoryId: cat('Plumbing & Sanitary'),  unit: 'Mtr',   minimumStock: 100,  hsnCode: '3917' },
    { materialName: 'CPVC Pipe 1 inch',          categoryId: cat('Plumbing & Sanitary'),  unit: 'Mtr',   minimumStock: 100,  hsnCode: '3917' },
    { materialName: 'SWR Pipe 4 inch',           categoryId: cat('Plumbing & Sanitary'),  unit: 'Mtr',   minimumStock: 50,   hsnCode: '3917' },
    { materialName: 'Water Storage Tank 500L',   categoryId: cat('Plumbing & Sanitary'),  unit: 'Nos',   minimumStock: 2 },
    // Paint & Chemicals
    { materialName: 'Exterior Emulsion Paint',   categoryId: cat('Paint & Chemicals'),    unit: 'Ltr',   minimumStock: 100,  hsnCode: '3209' },
    { materialName: 'Interior Emulsion Paint',   categoryId: cat('Paint & Chemicals'),    unit: 'Ltr',   minimumStock: 100,  hsnCode: '3209' },
    { materialName: 'Wall Putty',                categoryId: cat('Paint & Chemicals'),    unit: 'KG',    minimumStock: 200,  hsnCode: '3214' },
    { materialName: 'Primer',                    categoryId: cat('Paint & Chemicals'),    unit: 'Ltr',   minimumStock: 50 },
    // Wood & Timber
    { materialName: 'Shuttering Plywood 12mm',   categoryId: cat('Wood & Timber'),        unit: 'Sheet', minimumStock: 50 },
    { materialName: 'Flush Door 32mm',           categoryId: cat('Wood & Timber'),        unit: 'Nos',   minimumStock: 10 },
    // Waterproofing
    { materialName: 'Dr. Fixit Pidiproof LW+',  categoryId: cat('Waterproofing'),        unit: 'KG',    minimumStock: 50 },
    { materialName: 'Bitumen Membrane 4mm',      categoryId: cat('Waterproofing'),        unit: 'SQM',   minimumStock: 100 },
    // Hardware & Fasteners
    { materialName: 'Anchor Fastener M8',        categoryId: cat('Hardware & Fasteners'), unit: 'Nos',   minimumStock: 500 },
    { materialName: 'GI Nail 3 inch',            categoryId: cat('Hardware & Fasteners'), unit: 'KG',    minimumStock: 20 },
    // Safety Equipment
    { materialName: 'Safety Helmet',             categoryId: cat('Safety Equipment'),     unit: 'Nos',   minimumStock: 20 },
    { materialName: 'Safety Shoes',              categoryId: cat('Safety Equipment'),     unit: 'Pair',  minimumStock: 10 },
    { materialName: 'Safety Harness',            categoryId: cat('Safety Equipment'),     unit: 'Nos',   minimumStock: 5 },
    // Finishing Materials
    { materialName: 'Gypsum Plaster',            categoryId: cat('Finishing Materials'),  unit: 'KG',    minimumStock: 500 },
    { materialName: 'Tile Adhesive',             categoryId: cat('Finishing Materials'),  unit: 'KG',    minimumStock: 200 },
    { materialName: 'Tile Grout',               categoryId: cat('Finishing Materials'),  unit: 'KG',    minimumStock: 50 },
  ];

  for (const mat of materials) {
    const existing = await prisma.material.findFirst({ where: { materialName: mat.materialName, categoryId: mat.categoryId } });
    if (!existing) await prisma.material.create({ data: mat });
  }

  // ── Suppliers ────────────────────────────────────────────────────────────────
  const suppliers = [
    { supplierName: 'Shree Cement Traders',      mobile: '9811001001', email: 'shreecement@gmail.com',   address: 'Sector 18, Gurgaon',      gstNumber: '06AABCS1234A1Z5' },
    { supplierName: 'Jindal Steel & Power Ltd',  mobile: '9811002002', email: 'sales@jindalsteel.com',   address: 'Hisar, Haryana',          gstNumber: '06AABCJ5678B2Z1' },
    { supplierName: 'Navkar Building Materials', mobile: '9811003003', email: 'navkar@buildmat.com',     address: 'Faridabad, Haryana',      gstNumber: '06AABCN9012C3Z7' },
    { supplierName: 'Garg Electricals',          mobile: '9811004004', email: 'garg.elec@gmail.com',     address: 'Sector 14, Gurgaon',      gstNumber: '06AABCG3456D4Z3' },
    { supplierName: 'Rajdhani Plumbing Works',   mobile: '9811005005', email: 'rajdhani@plumbing.com',   address: 'Palam Vihar, Gurgaon',    gstNumber: '06AABCR7890E5Z9' },
  ];

  for (const sup of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { supplierName: sup.supplierName } });
    if (!existing) await prisma.supplier.create({ data: sup });
  }

  // ── Project: Orchid Ivy ──────────────────────────────────────────────────────
  let project = await prisma.project.findFirst({ where: { projectName: 'Orchid Ivy' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        projectName: 'Orchid Ivy',
        projectType: 'THREE_BHK',
        location:    'Sector 85, Gurgaon, Haryana',
        startDate:   new Date('2024-01-15'),
        endDate:     new Date('2026-12-31'),
        status:      'ACTIVE',
        budget:      150000000,
        description: 'Premium residential project — 2 towers, G+14 floors, 3 BHK & 4 BHK apartments',
      },
    });
  }

  // Sites
  const siteNames = ['Orchid Ivy 1', 'Orchid Ivy 2'];
  for (const siteName of siteNames) {
    const existing = await prisma.site.findFirst({ where: { siteName, projectId: project.id } });
    if (!existing) {
      await prisma.site.create({
        data: {
          siteName,
          projectId:   project.id,
          description: siteName === 'Orchid Ivy 1' ? 'Tower A — Ground to 14th Floor' : 'Tower B — Ground to 14th Floor',
          address:     'Sector 85, Gurgaon, Haryana',
        },
      });
    }
  }

  console.log('✅ Seed completed successfully');
  console.log('\n👤 Default Users:');
  console.log('  admin@orchidconstruction.com        / Admin@123       (ADMIN)');
  console.log('  md@orchidconstruction.com           / Md@123          (MD)');
  console.log('  director@orchidconstruction.com     / Director@123    (EXE_DIRECTOR)');
  console.log('  president@orchidconstruction.com    / President@123   (PRESIDENT_PROJECTS)');
  console.log('  cfo@orchidconstruction.com          / Cfo@123         (CFO)');
  console.log('  gm.purchase@orchidconstruction.com  / GmPurchase@123  (GM_PURCHASE)');
  console.log('  purchase.hod@orchidconstruction.com / PurchaseHod@123 (PURCHASE_HOD)');
  console.log('  user.hod@orchidconstruction.com     / UserHod@123     (USER_HOD)');
  console.log('  incharge@orchidconstruction.com     / Incharge@123    (INCHARGE)');
  console.log('  store@orchidconstruction.com        / Store@123       (STORE_MANAGER)');
  console.log('  finance@orchidconstruction.com      / Finance@123     (FINANCE)');
  console.log('  engineer@orchidconstruction.com     / Engineer@123    (SITE_ENGINEER)');
  console.log('\n📦 Demo Data:');
  console.log('  15 Categories, 45 Materials, 5 Suppliers');
  console.log('  Project: Orchid Ivy → Sites: Orchid Ivy 1, Orchid Ivy 2');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
