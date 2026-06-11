const prisma = require('../config/database');

const generateBillNumber = async () => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `PO-${year}${month}-`;
  const count = await prisma.purchase.count({
    where: { billNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateIssueNumber = async () => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `ISS-${year}${month}-`;
  const count = await prisma.stockIssue.count({
    where: { issueNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateTransferNumber = async () => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `TRF-${year}${month}-`;
  const count = await prisma.stockTransfer.count({
    where: { transferNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateIndentNumber = async () => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `IND-${year}${month}-`;
  const count = await prisma.indent.count({
    where: { indentNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateCSNumber = async () => {
  const today = new Date();
  const year  = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `CS-${year}${month}-`;
  const count = await prisma.comparativeStatement.count({ where: { csNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateNFANumber = async () => {
  const today = new Date();
  const year  = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `NFA-${year}${month}-`;
  // eslint-disable-next-line no-unused-vars
  const count = await prisma.nFA.count({ where: { nfaNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

const generateMRNNumber = async () => {
  const today = new Date();
  const year  = today.getFullYear().toString().slice(-2);
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `MRN-${year}${month}-`;
  const count = await prisma.mRN.count({ where: { mrnNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
};

module.exports = {
  generateBillNumber,
  generateIssueNumber,
  generateTransferNumber,
  generateIndentNumber,
  generateCSNumber,
  generateNFANumber,
  generateMRNNumber,
};
