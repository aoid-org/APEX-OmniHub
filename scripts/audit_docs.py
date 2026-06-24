import os
from datetime import datetime

EXCLUDE_DIRS = {'node_modules', '.git', 'venv', 'local-agents', '.pytest_cache'}

FRONTMATTER_TEMPLATE = """---
version: 1.0.0
last_audited: {date}
status: verified
---
"""

def has_frontmatter(content):
    return content.startswith("---")

def process_file(filepath):
    try:
        with open(filepath, encoding='utf-8') as f:
            content = f.read()
            
        if not has_frontmatter(content):
            date_str = datetime.now().strftime('%Y-%m-%d')
            new_content = FRONTMATTER_TEMPLATE.format(date=date_str) + "\n" + content
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
    except Exception as e:
        print(f"Failed to process {filepath}: {e}")
    return False

def main():
    root_dir = '.'
    processed_count = 0
    
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude directories
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        
        for filename in filenames:
            if filename.endswith('.md'):
                filepath = os.path.join(dirpath, filename)
                if process_file(filepath):
                    processed_count += 1
                    
    print(f"Audit Complete. Injected frontmatter into {processed_count} files.")

if __name__ == "__main__":
    main()
