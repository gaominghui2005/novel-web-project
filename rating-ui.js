// rating-ui.js —— 五星打分组件 + 排名列表
import { rateBook, myRating } from './api-client.js';

export function renderStars(score, size = 14) {
  score = Number(score || 0);
  const full = Math.floor(score);
  const half = (score - full) >= 0.75 ? 1 : (score - full) >= 0.25 ? 0.5 : 0;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    let cls = 'rs-empty';
    if (i <= full) cls = 'rs-full';
    else if (i === full + 1 && half) cls = 'rs-half';
    html += `<span class="${cls}" style="font-size:${size}px">★</span>`;
  }
  html += `<span class="rs-num">${score ? score.toFixed(1) : '—'}</span>`;
  return html;
}

export async function renderRateWidget(bookId, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'rate-widget';
  wrap.innerHTML = `
    <div class="rate-row" id="rw_${bookId}"></div>
    <div class="rate-hint" id="rh_${bookId}">点击星星打分</div>
  `;
  const row = wrap.querySelector(`#rw_${bookId}`);
  const hint = wrap.querySelector(`#rh_${bookId}`);

  let myScore = 0;
  try {
    const r = await myRating(bookId);
    myScore = r.score || 0;
  } catch {}

  function paint(s) {
    row.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.className = 'rw-star' + (i <= s ? ' on' : '');
      star.textContent = '★';
      star.addEventListener('click', async () => {
        try {
          await rateBook(bookId, i);
          myScore = i;
          paint(i);
          hint.textContent = `已打 ${i} 星`;
          if (onChange) onChange();
        } catch (e) {
          hint.textContent = '失败: ' + e.message;
        }
      });
      row.appendChild(star);
    }
  }
  paint(myScore);
  hint.textContent = myScore ? `你已打 ${myScore} 星,点击重打分` : '点击星星打分';
  return wrap;
}
