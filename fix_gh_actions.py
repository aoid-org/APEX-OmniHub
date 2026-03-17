import os
import re
import urllib.request
import json

def get_sha(repo, tag):
    try:
        url = f"https://api.github.com/repos/{repo}/commits/{tag}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data['sha']
    except Exception as e:
        print(f"Failed to get sha for {repo}@{tag}: {e}")
        return None

shas = {}

for root, dirs, files in os.walk('.github/workflows'):
    for file in files:
        if not file.endswith('.yml'): continue
        path = os.path.join(root, file)
        with open(path, 'r') as f:
            content = f.read()

        # match uses: user/repo@version
        # but skip if already has SHA (40 chars)
        def repl(m):
            full = m.group(0)
            repo = m.group(1)
            tag = m.group(2)
            if len(tag) == 40 and re.match(r'^[0-9a-f]+$', tag):
                return full
            if f"{repo}@{tag}" not in shas:
                sha = get_sha(repo, tag)
                if sha:
                    shas[f"{repo}@{tag}"] = sha
                else:
                    return full
            sha = shas[f"{repo}@{tag}"]
            return f"uses: {repo}@{sha} # {tag}"

        new_content = re.sub(r'uses:\s+([a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+)@([^#\s]+)', repl, content)
        if new_content != content:
            with open(path, 'w') as f:
                f.write(new_content)
            print(f"Updated {path}")
