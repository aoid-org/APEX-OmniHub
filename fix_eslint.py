import os
def modify(path):
    if not os.path.exists(path): return
    with open(path, 'r') as f: c = f.read()
    c = c.replace('export default tseslint.config([', 'export default tseslint.config(').replace(']);', ');')
    with open(path, 'w') as f: f.write(c)

modify('apps/omnihub-site/eslint.config.js')
modify('eslint.config.js')
modify('eslint.config.shared.js')
