#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sync_works.py — 把 works.json 同步到全站各处

做的事情：
  1. 校验首页三个分区的「N 个作品」是否等于 works.json 的统计
  2. 更新首页的 meta / og / twitter / JSON-LD 里的作品数
  3. 更新 README 的作品数与成就数
  4. 重新生成 sitemap.xml（只保留 startian.top 同源条目，去掉子域）

不改页面结构，只改数字和列表 —— 重复执行无副作用。

用法：
  python sync_works.py          # 同步 + 报告
  python sync_works.py --check  # 只检查不写入（CI 用）
"""
import json
import os
import re
import sys
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
WJ = os.path.join(BASE, 'works.json')
SITE = 'https://startian.top'


def load():
    with open(WJ, encoding='utf-8') as f:
        return json.load(f)


def sync_index(t, data, check):
    """返回 (新文本, 改动列表)"""
    works = data['works']
    total = len(works)
    by_zone = Counter(w['zone'] for w in works)
    changes = []

    # 分区计数：以 works.json 为准（单一数据源）
    for z, cnt in by_zone.items():
        pat = re.compile(r'(data-i18n="zone\.' + z + r'\.count">)(\d+)( 个作品)')
        m = pat.search(t)
        if m and int(m.group(2)) != cnt:
            changes.append(f'zone.{z}.count: {m.group(2)} → {cnt}')
            if not check:
                t = pat.sub(lambda mm, c=cnt: mm.group(1) + str(c) + mm.group(3), t, count=1)

    # 全局作品数（多种写法）
    for pat, label in [
        (r'(\d+) 个免费网页', 'N 个免费网页'),
        (r'(\d+) 个作品', 'N 个作品'),
    ]:
        rx = re.compile(pat)
        for m in rx.finditer(t):
            head = t[max(0, m.start() - 40):m.start()]
            if 'zone.' in head and '.count"' in head:
                continue                      # 分区计数，不算全局
            if int(m.group(1)) != total:
                old = m.group(0)
                changes.append(f'{label}: {old} → {total}{old[len(m.group(1)):]}')
        if not check:
            def _rep(mm, tot=total, src=t):
                # 跳过 data-i18n="zone.xxx.count">N 个作品 这类分区计数
                head = src[max(0, mm.start() - 40):mm.start()]
                if 'zone.' in head and '.count"' in head:
                    return mm.group(0)
                return str(tot) + mm.group(0)[len(mm.group(1)):]
            t = rx.sub(_rep, t)

    return t, changes


def sync_readme(t, data, check):
    total = len(data['works'])
    ach = data['achievements']
    changes = []

    for m in re.finditer(r'(\d+) 个作品', t):
        if int(m.group(1)) != total:
            changes.append(f'README 作品: {m.group(0)} → {total} 个作品')
    for m in re.finditer(r'(\d+) 枚成就', t):
        if int(m.group(1)) != ach:
            changes.append(f'README 成就: {m.group(0)} → {ach} 枚成就')

    if not check:
        t = re.sub(r'\d+ 个作品', f'{total} 个作品', t)
        t = re.sub(r'\d+ 枚成就', f'{ach} 枚成就', t)
    return t, changes


def build_sitemap(data):
    """只收录 startian.top 同源页面（sitemap 协议要求同 host）"""
    updated = data.get('updated', '2026-10-27')
    items = [(SITE + '/', 1.0, 'weekly')]
    seen = {SITE + '/'}

    for w in data['works']:
        u = w['url'].rstrip('/') + '/'
        if not u.startswith(SITE + '/'):
            continue                      # 子域跳过
        if u in seen:
            continue
        seen.add(u)
        pri = 0.9 if w['id'] == 'map' else 0.8
        items.append((u, pri, 'monthly'))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, pri, freq in items:
        lines += ['  <url>',
                  f'    <loc>{loc}</loc>',
                  f'    <lastmod>{updated}</lastmod>',
                  f'    <changefreq>{freq}</changefreq>',
                  f'    <priority>{pri:.1f}</priority>',
                  '  </url>']
    lines.append('</urlset>')
    lines.append('')
    return '\n'.join(lines), len(items)


def main():
    check = '--check' in sys.argv
    data = load()
    total = len(data['works'])
    by_zone = Counter(w['zone'] for w in data['works'])

    print(f'works.json: {total} 个作品 / {data["achievements"]} 枚成就')
    print('  分区: ' + '  '.join(f'{z}={n}' for z, n in sorted(by_zone.items())))
    print()

    all_changes = []

    # 首页
    idx = os.path.join(BASE, 'index.html')
    raw = open(idx, 'rb').read()
    t = raw.decode('utf-8')
    t2, ch = sync_index(t, data, check)
    all_changes += ch
    if not check and t2 != t:
        open(idx, 'wb').write(t2.encode('utf-8'))

    # README
    rp = os.path.join(BASE, 'README.md')
    if os.path.isfile(rp):
        r = open(rp, encoding='utf-8').read()
        r2, ch = sync_readme(r, data, check)
        all_changes += ch
        if not check and r2 != r:
            open(rp, 'wb').write(r2.encode('utf-8'))

    # sitemap
    sm, n = build_sitemap(data)
    sp = os.path.join(BASE, 'sitemap.xml')
    old = open(sp, encoding='utf-8').read() if os.path.isfile(sp) else ''
    if old.strip() != sm.strip():
        all_changes.append(f'sitemap: 重新生成 {n} 条同源 URL')
        if not check:
            open(sp, 'wb').write(sm.encode('utf-8'))

    if all_changes:
        print('改动:' if not check else '发现不一致:')
        for c in all_changes:
            print('  ·', c)
        if check:
            print('\n（--check 模式，未写入）')
            sys.exit(1)
    else:
        print('✓ 全站数字已一致，无需改动')


if __name__ == '__main__':
    main()
