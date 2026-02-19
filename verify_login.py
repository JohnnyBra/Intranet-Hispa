from playwright.sync_api import sync_playwright

def test_login_page():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            url = "http://localhost:3010"
            print(f"Navigating to {url}")
            page.goto(url)
            # Wait for some text on the login page
            # Based on Login.tsx content: "Bienvenido, Docente"
            try:
                page.wait_for_selector('text=Bienvenido, Docente', state='visible', timeout=15000)
                print("Found 'Bienvenido, Docente'")
            except:
                print("Could not find selector, taking screenshot anyway")

            # Take screenshot
            page.screenshot(path="verification_login.png")
            print("Screenshot saved to verification_login.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification_error.png")

if __name__ == "__main__":
    test_login_page()
