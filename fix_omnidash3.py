path = 'apps/omnihub-site/dashboard/OmniDashShell.tsx'
with open(path, 'r') as f:
    c = f.read()

c = c.replace('  }} >\n    {children}\n  </div>', '  }} >\n    {children}\n  </button>')

with open(path, 'w') as f:
    f.write(c)
