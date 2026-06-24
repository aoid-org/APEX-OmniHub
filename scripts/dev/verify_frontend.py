from playwright.sync_api import sync_playwright


def verify_dashboard(page):
    print("Navigating to http://localhost:8080/omnidash...")
    page.goto("http://localhost:8080/omnidash", wait_until="networkidle")

    # Wait for the tiles to render
    print("Waiting for connector tiles...")
    try:
        page.wait_for_selector('.apex-canvas', timeout=10000)
    except Exception as e:
        print(f"Error waiting for canvas: {e}")

    page.screenshot(path="dashboard_overview.png", full_page=True)
    print("Saved dashboard_overview.png")

    print("Navigating to http://localhost:8080/omnidash/integrations...")
    page.goto("http://localhost:8080/omnidash/integrations", wait_until="networkidle")
    try:
        page.wait_for_selector('[data-testid="connector-grid"]', timeout=10000)
    except Exception as e:
        print(f"Error waiting for grid: {e}")

    page.screenshot(path="integrations_page.png", full_page=True)
    print("Saved integrations_page.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify_dashboard(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
