const stamp = () => new Date().toISOString();

function ok(res, message, data = null, status = 200) {
  return res.status(status).json({ success: true, message, data, timestamp: stamp() });
}

function paged(res, message, { content, page, size, total }) {
  return ok(res, message, {
    content,
    page,
    size,
    totalElements: total,
    totalPages: Math.ceil(total / size),
  });
}

module.exports = { ok, paged, stamp };
