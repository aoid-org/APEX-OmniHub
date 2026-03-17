path = 'apps/omnihub-site/dashboard/OmniDashShell.tsx'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('{/* eslint-disable-next-line */} {/* eslint-disable-next-line */} role={onClick ? "button" : "presentation"}', 'role={onClick ? "button" : "presentation"}')

with open(path, 'w') as f:
    f.write(c)
