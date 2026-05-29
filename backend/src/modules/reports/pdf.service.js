const PDFDocument = require('pdfkit');

const generatePurchaseInvoice = async (purchase, res) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${purchase.billNo}.pdf`);
  doc.pipe(res);

  const COLORS = { primary: '#1a3675', secondary: '#214392', accent: '#c8971f', text: '#1f2937', light: '#f8fafc', border: '#e2e8f0' };

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 110).fill(COLORS.primary);
  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text(process.env.COMPANY_NAME || 'Orchid Construction Pvt. Ltd.', 50, 25);
  doc.fontSize(9).font('Helvetica').text(process.env.COMPANY_ADDRESS || 'Mumbai, Maharashtra', 50, 52);
  doc.text(`Phone: ${process.env.COMPANY_PHONE || '+91-9876543210'}  |  Email: ${process.env.COMPANY_EMAIL || 'info@orchidconstruction.com'}`, 50, 65);
  doc.text(`GST: ${process.env.COMPANY_GST || '27AABCU9603R1ZX'}`, 50, 78);

  doc.fillColor(COLORS.accent).fontSize(14).font('Helvetica-Bold').text('PURCHASE INVOICE', doc.page.width - 180, 35);
  doc.fillColor('white').fontSize(9).font('Helvetica').text(`Invoice No: ${purchase.billNo}`, doc.page.width - 180, 58);
  doc.text(`Date: ${new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}`, doc.page.width - 180, 72);
  doc.text(`Status: ${purchase.status}`, doc.page.width - 180, 86);

  let y = 130;

  // ── Bill To / Supplier ──────────────────────────────────────────────────────
  doc.rect(50, y, 240, 90).fill(COLORS.light).stroke(COLORS.border);
  doc.rect(310, y, 240, 90).fill(COLORS.light).stroke(COLORS.border);

  doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold').text('SUPPLIER DETAILS', 60, y + 8);
  doc.fillColor(COLORS.text).fontSize(9).font('Helvetica');
  doc.text(purchase.supplier.supplierName, 60, y + 24);
  doc.text(purchase.supplier.address || 'N/A', 60, y + 36, { width: 220 });
  if (purchase.supplier.mobile) doc.text(`Phone: ${purchase.supplier.mobile}`, 60, y + 60);
  if (purchase.supplier.gstNumber) doc.text(`GST: ${purchase.supplier.gstNumber}`, 60, y + 72);

  doc.fillColor(COLORS.primary).fontSize(10).font('Helvetica-Bold').text('PROJECT / SITE', 320, y + 8);
  doc.fillColor(COLORS.text).fontSize(9).font('Helvetica');
  doc.text(`Project: ${purchase.project?.projectName || 'N/A'}`, 320, y + 24);
  doc.text(`Site: ${purchase.site?.siteName || 'N/A'}`, 320, y + 36);
  doc.text(`Ordered By: ${purchase.orderedBy?.name || 'N/A'}`, 320, y + 60);
  if (purchase.receivedDate) doc.text(`Received: ${new Date(purchase.receivedDate).toLocaleDateString('en-IN')}`, 320, y + 72);

  y += 110;

  // ── Items Table ─────────────────────────────────────────────────────────────
  const colWidths = [30, 180, 60, 60, 60, 70, 80];
  const colX = [50];
  for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);

  doc.rect(50, y, 500, 22).fill(COLORS.primary);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
  ['#', 'Material', 'Unit', 'Qty', 'Rate', 'GST%', 'Amount'].forEach((header, i) => doc.text(header, colX[i] + 4, y + 7, { width: colWidths[i] - 8, align: 'center' }));

  y += 22;
  let subtotal = 0;
  let totalGst = 0;

  purchase.items.forEach((item, idx) => {
    const rowColor = idx % 2 === 0 ? 'white' : COLORS.light;
    doc.rect(50, y, 500, 20).fill(rowColor).stroke(COLORS.border);
    doc.fillColor(COLORS.text).fontSize(8).font('Helvetica');
    doc.text(String(idx + 1), colX[0] + 4, y + 6, { width: colWidths[0] - 8, align: 'center' });
    doc.text(item.material.materialName, colX[1] + 4, y + 6, { width: colWidths[1] - 8 });
    doc.text(item.unit, colX[2] + 4, y + 6, { width: colWidths[2] - 8, align: 'center' });
    doc.text(parseFloat(item.quantity).toFixed(2), colX[3] + 4, y + 6, { width: colWidths[3] - 8, align: 'right' });
    doc.text(`₹${parseFloat(item.rate).toFixed(2)}`, colX[4] + 4, y + 6, { width: colWidths[4] - 8, align: 'right' });
    doc.text(`${parseFloat(item.gstPercent || 0).toFixed(1)}%`, colX[5] + 4, y + 6, { width: colWidths[5] - 8, align: 'center' });
    doc.text(`₹${parseFloat(item.amount).toFixed(2)}`, colX[6] + 4, y + 6, { width: colWidths[6] - 8, align: 'right' });
    subtotal += parseFloat(item.amount) - parseFloat(item.gstAmount || 0);
    totalGst += parseFloat(item.gstAmount || 0);
    y += 20;
  });

  y += 10;

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalsX = 360;
  const totalsW = 190;
  const drawTotalRow = (label, value, isBold = false, color = COLORS.text) => {
    if (isBold) doc.rect(totalsX, y, totalsW, 22).fill(COLORS.primary);
    doc.fillColor(isBold ? 'white' : color).fontSize(9).font(isBold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, totalsX + 8, y + 7, { width: 110 });
    doc.text(value, totalsX + 8, y + 7, { width: totalsW - 16, align: 'right' });
    y += isBold ? 22 : 18;
  };

  drawTotalRow('Subtotal:', `₹${parseFloat(purchase.subtotal).toFixed(2)}`);
  drawTotalRow('GST Amount:', `₹${parseFloat(purchase.gstAmount).toFixed(2)}`);
  if (parseFloat(purchase.transportCost) > 0) drawTotalRow('Transport:', `₹${parseFloat(purchase.transportCost).toFixed(2)}`);
  if (parseFloat(purchase.discountAmount) > 0) drawTotalRow('Discount:', `-₹${parseFloat(purchase.discountAmount).toFixed(2)}`, false, '#dc2626');
  drawTotalRow('TOTAL AMOUNT:', `₹${parseFloat(purchase.totalAmount).toFixed(2)}`, true);
  if (parseFloat(purchase.paidAmount) > 0) {
    drawTotalRow('Paid:', `₹${parseFloat(purchase.paidAmount).toFixed(2)}`);
    drawTotalRow('Balance Due:', `₹${(parseFloat(purchase.totalAmount) - parseFloat(purchase.paidAmount)).toFixed(2)}`, false, '#dc2626');
  }

  // ── Notes ───────────────────────────────────────────────────────────────────
  if (purchase.notes) {
    y += 20;
    doc.fillColor(COLORS.text).fontSize(9).font('Helvetica-Bold').text('Notes:', 50, y);
    doc.font('Helvetica').text(purchase.notes, 50, y + 14, { width: 300 });
  }

  // ── Signature ───────────────────────────────────────────────────────────────
  const sigY = doc.page.height - 120;
  doc.moveTo(50, sigY).lineTo(200, sigY).stroke(COLORS.border);
  doc.moveTo(350, sigY).lineTo(500, sigY).stroke(COLORS.border);
  doc.fillColor(COLORS.text).fontSize(8).text('Supplier Signature', 50, sigY + 8);
  doc.text('Authorized Signatory', 350, sigY + 8);

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill(COLORS.primary);
  doc.fillColor('white').fontSize(8).text('This is a computer-generated document. Thank you for your business.', 50, doc.page.height - 26, { align: 'center', width: doc.page.width - 100 });

  doc.end();
};

module.exports = { generatePurchaseInvoice };
