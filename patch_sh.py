with open("scripts/repo_inventory.sh", "r") as f:
    content = f.read()

new_content = content.replace("sed 's|^./||'", 'sed "$STRIP_PREFIX"')
new_content = new_content.replace('echo "repo=$(basename "$(pwd)")" > inventory/repo_meta.txt', 'STRIP_PREFIX="s|^./||"\n\necho "repo=$(basename \\"$(pwd)\\")" > inventory/repo_meta.txt')

if content != new_content:
    with open("scripts/repo_inventory.sh", "w") as f:
        f.write(new_content)
    print("Patched repo_inventory.sh")
else:
    print("Could not find old code")
