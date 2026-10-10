// fetch 兜底封装:header 已带 cookie,统一处理文本/JSON/错误
window.__novelFetch = async function (path, opts = {}) {
  const { method = 'GET', body, headers = {} } = opts;
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error(data.error || `${path} ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};
