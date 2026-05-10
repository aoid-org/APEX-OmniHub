from playwright.sync_api import sync_playwright


def verify_dashboard(page):
    print("Navigating to http://localhost:8080/login...")
    page.goto("http://localhost:8080/login", wait_until="networkidle")

    # Check if there's a login form and try to login if so
    try:
        if page.query_selector('input[type="email"]'):
            print("Logging in with dummy credentials...")
            page.fill('input[type="email"]', 'admin@apex.test')
            page.fill('input[type="password"]', 'password')
            page.click('button[type="submit"]')
            page.wait_for_timeout(2000)
    except Exception as e:
        print(f"Error logging in: {e}")

    print("Navigating to http://localhost:8080/omnidash...")
    page.goto("http://localhost:8080/omnidash", wait_until="networkidle")

    # Wait for the tiles to render
    print("Waiting for connector tiles...")
    try:
        page.wait_for_selector('.apex-canvas', timeout=5000)
    except Exception as e:
        print(f"Error waiting for canvas: {e}")

    page.screenshot(path="auth_dashboard_overview.png", full_page=True)
    print("Saved auth_dashboard_overview.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify_dashboard(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
