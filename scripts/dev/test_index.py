from playwright.sync_api import sync_playwright


def verify_dashboard(page):
    print("Navigating to http://localhost:8080/...")
    page.goto("http://localhost:8080/", wait_until="networkidle")
    page.screenshot(path="index_page.png", full_page=True)
    print("Saved index_page.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        verify_dashboard(page)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
