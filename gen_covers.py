#!/usr/bin/env python3
"""生成 15 本小说的封面 SVG（按分类配色 + 标题文字）"""
import os

# (filename, title, genre_color_pair, subtitle)
BOOKS = [
    ('book_b1.svg',  '剑破苍穹',     ('#1f1432', '#4a1e5a'), '玄幻 · 林尘问道'),
    ('book_b2.svg',  '灵武帝尊',     ('#1f1432', '#4a1e5a'), '玄幻 · 横扫八荒'),
    ('book_b3.svg',  '山海仙途',     ('#1f1432', '#4a1e5a'), '玄幻 · 山海神话'),
    ('book_b4.svg',  '北上广不相信眼泪', ('#0f192d', '#325064'), '都市 · 三人行'),
    ('book_b5.svg',  '中年逆袭',     ('#0f192d', '#325064'), '都市 · 重新来过'),
    ('book_b6.svg',  '大唐拾遗',     ('#231923', '#503250'), '历史 · 贞观风云'),
    ('book_b7.svg',  '明末锦衣',     ('#231923', '#503250'), '历史 · 乱世抉择'),
    ('book_b8.svg',  '余生请多指教', ('#28141e', '#501e32'), '言情 · 温暖相依'),
    ('book_b9.svg',  '那年夏天',     ('#28141e', '#501e32'), '言情 · 重逢'),
    ('book_b10.svg', '深空回响',     ('#0a1e19', '#285040'), '科幻 · 星际探索'),
    ('book_b11.svg', '硅基黎明',     ('#0a1e19', '#285040'), '科幻 · AI觉醒'),
    ('book_b12.svg', '第十一根手指', ('#1a1a3a', '#3a2050'), '悬疑 · 法医秦川'),
    ('book_b13.svg', '夜行者手记',   ('#1a1a3a', '#3a2050'), '悬疑 · 夜色迷踪'),
    ('book_b14.svg', '林深时见鹿',   ('#231923', '#3a2050'), '散文 · 山林札记'),
    ('book_b15.svg', '慢煮光阴',     ('#231923', '#3a2050'), '散文 · 生活小品'),
]

# 一些装饰符号
SYMBOLS = {
    'g_fantasy':  '⚔',
    'g_city':     '🏙',
    'g_history':  '🏯',
    'g_romance':  '♡',
    'g_scifi':    '✦',
    'g_suspense': '⌖',
    'g_essay':    '✎',
}

# 标题长度自适应字号
def font_size_for_title(title):
    if len(title) <= 4: return 36
    elif len(title) <= 6: return 28
    elif len(title) <= 8: return 22
    else: return 18

ASSET_DIR = os.path.join(os.path.dirname(__file__), 'assets')

for fname, title, (c1, c2), sub in BOOKS:
    fs = font_size_for_title(title)
    sym = {
        '剑破苍穹':'⚔', '灵武帝尊':'⚒', '山海仙途':'☯',
        '北上广不相信眼泪':'◐', '那年夏天':'☀',
        '大唐拾遗':'印', '明末锦衣':'旗',
        '余生请多指教':'♡',
        '深空回响':'✦', '硅基黎明':'◈',
        '第十一根手指':'✋', '夜行者手记':'◆',
        '林深时见鹿':'❀', '慢煮光阴':'☕',
        '中年逆袭':'↗',
    }.get(title, '✦')

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="100%" stop-color="{c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.18)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <rect width="240" height="320" fill="url(#g)"/>
  <rect width="240" height="320" fill="url(#r)"/>
  <!-- 装饰小圆点 -->
  <circle cx="40" cy="60" r="2" fill="rgba(255,255,255,0.25)"/>
  <circle cx="200" cy="40" r="1.5" fill="rgba(255,255,255,0.2)"/>
  <circle cx="60" cy="280" r="2.5" fill="rgba(255,255,255,0.15)"/>
  <circle cx="190" cy="260" r="1.5" fill="rgba(255,255,255,0.2)"/>
  <circle cx="180" cy="100" r="1" fill="rgba(255,255,255,0.3)"/>
  <!-- 中央符号 -->
  <text x="120" y="155" text-anchor="middle" font-size="48" fill="rgba(255,255,255,0.35)" font-family="serif">{sym}</text>
  <!-- 标题 -->
  <text x="120" y="220" text-anchor="middle" font-size="{fs}" font-weight="700" fill="rgba(255,255,255,0.95)" font-family="'Microsoft YaHei', sans-serif">{title}</text>
  <!-- 副标题 -->
  <text x="120" y="250" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.6)" letter-spacing="2">{sub}</text>
  <!-- 底部装饰线 -->
  <line x1="100" y1="280" x2="140" y2="280" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  <text x="120" y="298" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.5)" letter-spacing="3">听书</text>
</svg>'''
    with open(os.path.join(ASSET_DIR, fname), 'w', encoding='utf-8') as f:
        f.write(svg)
    print(f'wrote {fname}')

# avatar.svg
avatar = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="ag" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7C9EFF"/>
      <stop offset="100%" stop-color="#A78BFA"/>
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="40" fill="url(#ag)"/>
  <circle cx="40" cy="30" r="14" fill="rgba(255,255,255,0.9)"/>
  <path d="M14 70 C14 56 24 48 40 48 C56 48 66 56 66 70 Z" fill="rgba(255,255,255,0.9)"/>
</svg>'''
with open(os.path.join(ASSET_DIR, 'avatar.svg'), 'w', encoding='utf-8') as f:
    f.write(avatar)
print('wrote avatar.svg')

print('done')