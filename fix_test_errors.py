import os
import re

def modify(path, func):
    with open(path, 'r') as f:
        c = f.read()
    new_c = func(c)
    if new_c != c:
        with open(path, 'w') as f:
            f.write(new_c)

# Fix dataset.drag-active in tests/omnidash/tile-stability.spec.tsx
modify('tests/omnidash/tile-stability.spec.tsx', lambda c: c.replace('dataset.drag-active', 'dataset.dragActive'))

# Fix parseInt error in src/omniconnect/storage/encrypted-storage.ts
# It became Number.Number.parseInt(...)
modify('src/omniconnect/storage/encrypted-storage.ts', lambda c: re.sub(r'Number\.Number(\.Number)*\.parseInt', 'Number.parseInt', c))

# Fix generate-readiness-report.mjs just in case
modify('scripts/generate-readiness-report.mjs', lambda c: re.sub(r'Number\.Number(\.Number)*\.parseInt', 'Number.parseInt', c).replace('Number.Number.parseFloat', 'Number.parseFloat'))
