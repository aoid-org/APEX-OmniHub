import os
import re

directory = 'tests/e2e-playwright'

skip_pattern = re.compile(r"(test\.skip\([^,]+,\s*)(['\"])(?!APEX-)(.*?)\2(\s*\))")
skip_empty_pattern = re.compile(r"test\.skip\(\s*\)")

def process_file(filepath):
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    original = content
    # Replace skips with messages
    content = skip_pattern.sub(r"\1\2APEX-1001: \3\2\4", content)
    # Replace empty skips
    content = skip_empty_pattern.sub(r"test.skip(true, 'APEX-1001: Test execution deferred')", content)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
