// 统一 fetch 封装
const BASE = ''; // 相对路径,本地和 Vercel 都一致

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',  // 必须,带 HttpOnly cookie
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `${method} ${path} ${res.status}`);
  }
  return data;
}

// ===== Auth =====
export async function authLoginOrRegister(phone, password) {
  return api('POST', '/api/auth/phone-password', { phone, password });
}
export async function authMe() {
  return api('GET', '/api/auth/me');
}
export async function authLogout() {
  return api('POST', '/api/auth/logout');
}
export async function authBecomeAuthor() {
  return api('POST', '/api/auth/become-author');
}

// ===== Books =====
export async function listBooks() {
  return api('GET', '/api/books');
}
export async function getBook(id) {
  return api('GET', `/api/books/${id}`);
}
export async function createBook(payload) {
  return api('POST', '/api/books', payload);
}
export async function setBookCover(id, cover_url) {
  return api('POST', `/api/books/${id}/cover`, { cover_url });
}

// ===== Chapters =====
export async function listChapters(bookId) {
  return api('GET', `/api/books/${bookId}/chapters`);
}
export async function getChapter(id) {
  return api('GET', `/api/chapters/${id}`);
}
export async function createChapter(bookId, title, body) {
  return api('POST', `/api/books/${bookId}/chapters`, { title, body });
}
export async function updateChapter(id, patch) {
  return api('PUT', `/api/chapters/${id}`, patch);
}

// ===== Shelf / History =====
export async function getShelf() {
  return api('GET', '/api/shelf');
}
export async function addShelf(bookId) {
  return api('POST', '/api/shelf', { book_id: bookId });
}
export async function removeShelf(bookId) {
  return api('DELETE', '/api/shelf', { book_id: bookId });
}
export async function getHistory() {
  return api('GET', '/api/history');
}
export async function addHistory(bookId, chapterId) {
  return api('POST', '/api/history', { book_id: bookId, chapter_id: chapterId });
}

// ===== Banners =====
export async function listBanners() {
  return api('GET', '/api/banners');
}
export async function createBanner(text, active = true) {
  return api('POST', '/api/banners', { text, active });
}
export async function updateBanner(id, patch) {
  return api('PUT', '/api/banners', { id, ...patch });
}

// ===== Ratings =====
export async function topBooks(limit = 20) {
  return api('GET', `/api/ratings?type=top&limit=${limit}`);
}
export async function rateBook(bookId, score) {
  return api('POST', '/api/ratings', { book_id: bookId, score });
}
export async function myRating(bookId) {
  return api('GET', `/api/ratings/me/${bookId}`);
}
