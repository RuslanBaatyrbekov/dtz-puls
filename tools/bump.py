#!/usr/bin/env python3
"""Release helper: bump the app version everywhere (index.html ?v=, APP_VER in app.js, version.json).
Open apps notice version.json and reload themselves. Usage: python3 tools/bump.py"""
import re, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
p = lambda f: os.path.join(root, f)
html = open(p('index.html'), encoding='utf-8').read()
n = max(int(x) for x in re.findall(r'\?v=(\d+)', html)) + 1
open(p('index.html'), 'w', encoding='utf-8').write(re.sub(r'\?v=\d+', '?v=%d' % n, html))
js = open(p('app.js'), encoding='utf-8').read()
open(p('app.js'), 'w', encoding='utf-8').write(re.sub(r'var APP_VER=\d+', 'var APP_VER=%d' % n, js, count=1))
open(p('version.json'), 'w').write('{"v":%d}\n' % n)
print('version', n)
