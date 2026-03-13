import os
import re

search_dirs = [r"apps\omnihub-site", r"src"]

# Define raw replacement pairs
replacements = [
    (r"@/components/omnidash", r"@/dashboard/components"),
    (r"@/components/dashboard", r"@/dashboard/components"),
    (r"@/pages/DashboardOverview", r"@/dashboard/components/DashboardOverview"),
    # Common relative patterns (convert to alias where possible for cleanliness)
    (r"../../components/omnidash", r"@/dashboard/components"),
    (r"../components/omnidash", r"@/dashboard/components"),
    (r"../../../components/omnidash", r"@/dashboard/components"),
    (r"../../../../components/omnidash", r"@/dashboard/components"),
    (r"../../pages/DashboardOverview", r"@/dashboard/components/DashboardOverview"),
    (r"../pages/DashboardOverview", r"@/dashboard/components/DashboardOverview"),
    (r"../../../pages/DashboardOverview", r"@/dashboard/components/DashboardOverview"),
    (
        r"../../../../pages/DashboardOverview",
        r"@/dashboard/components/DashboardOverview",
    ),
    (r"../../components/dashboard", r"@/dashboard/components"),
    (r"../components/dashboard", r"@/dashboard/components"),
    (r"../../../components/dashboard", r"@/dashboard/components"),
    # Stale relative imports from moved dashboard/components/ files
    (r"../../stores/", r"@/stores/"),
    (r"../../../stores/", r"@/stores/"),
    (r"../../lib/", r"@/lib/"),
    (r"../../../lib/", r"@/lib/"),
    (r"../../../../../../src/components/ui/", r"@/components/ui/"),
    (r"../../../../../src/components/ui/", r"@/components/ui/"),
    (r"../../../../src/components/ui/", r"@/components/ui/"),
    (r"../../../src/components/ui/", r"@/components/ui/"),
]

SKIP_DIRS = {"node_modules", ".next", "dist", ".git", "coverage"}


def replace_in_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)

    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Updated: {filepath}")


for search_dir in search_dirs:
    for root, dirs, files in os.walk(search_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for file in files:
            if file.endswith((".ts", ".tsx")):
                filepath = os.path.join(root, file)
                replace_in_file(filepath)

print("Import resolution script finished.")
