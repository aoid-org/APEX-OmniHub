import os
import re

search_dirs = [r"apps\omnihub-site", r"src"]

dash_comp = r"@/dashboard/components"
dash_overview = r"@/dashboard/components/DashboardOverview"
comp_ui = r"@/components/ui/"

# Define raw replacement pairs
replacements = [
    (r"@/components/omnidash", dash_comp),
    (r"@/components/dashboard", dash_comp),
    (r"@/pages/DashboardOverview", dash_overview),
    # Common relative patterns (convert to alias where possible for cleanliness)
    (r"../../components/omnidash", dash_comp),
    (r"../components/omnidash", dash_comp),
    (r"../../../components/omnidash", dash_comp),
    (r"../../../../components/omnidash", dash_comp),
    (r"../../pages/DashboardOverview", dash_overview),
    (r"../pages/DashboardOverview", dash_overview),
    (r"../../../pages/DashboardOverview", dash_overview),
    (r"../../../../pages/DashboardOverview", dash_overview),
    (r"../../components/dashboard", dash_comp),
    (r"../components/dashboard", dash_comp),
    (r"../../../components/dashboard", dash_comp),
    # Stale relative imports from moved dashboard/components/ files
    (r"../../stores/", r"@/stores/"),
    (r"../../../stores/", r"@/stores/"),
    (r"../../lib/", r"@/lib/"),
    (r"../../../lib/", r"@/lib/"),
    (r"../../../../../../src/components/ui/", comp_ui),
    (r"../../../../../src/components/ui/", comp_ui),
    (r"../../../../src/components/ui/", comp_ui),
    (r"../../../src/components/ui/", comp_ui),
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
