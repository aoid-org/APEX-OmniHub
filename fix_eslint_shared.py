import os
path = 'eslint.config.shared.js'
with open(path, 'r') as f:
    c = f.read()

# Original was:
# export const createSharedConfig = () => {
#   return tseslint.config(
#     { ... }
#   );
# };
# I accidentally replaced `tseslint.config(` with `tseslint.config([` and `);` with `]);`.
# Let's revert and fix properly.
c = c.replace('tseslint.config([', 'tseslint.config(').replace(']);', ');')
c = c.replace('return tseslint.config(', 'return tseslint.config([')
c = c.replace('\n  );', '\n  ]);')

with open(path, 'w') as f:
    f.write(c)
