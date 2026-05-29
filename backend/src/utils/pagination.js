const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildOrderBy = (sortBy, sortOrder = 'desc', defaultField = 'createdAt') => {
  const field = sortBy || defaultField;
  const order = ['asc', 'desc'].includes(sortOrder?.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';
  return { [field]: order };
};

const buildSearch = (search, fields) => {
  if (!search?.trim()) return {};
  return {
    OR: fields.map((field) => ({
      [field]: { contains: search.trim(), mode: 'insensitive' },
    })),
  };
};

module.exports = { getPagination, buildOrderBy, buildSearch };
