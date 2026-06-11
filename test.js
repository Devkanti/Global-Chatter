const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
          },
          body: JSON.stringify({
            token: 'fake-token',
            user: { username: 'testuser' }
          })
        });
      } else if (request.url().includes('socket.io') || request.url().includes('/push/subscribe')) {
        request.respond({ status: 200, body: 'ok' });
      } else {
        request.continue();
      }
    });

    await page.goto('http://localhost:5173');
    await page.evaluate(() => {
      window.localStorage.setItem('chat_priv_testuser', '{"kty":"RSA","n":"dummy"}');
      window.localStorage.setItem('chat_pub_testuser', '{"kty":"RSA","n":"dummy"}');
    });

    await page.waitForSelector('input[type="email"]');
    
    // Fill login form
    await page.type('input[type="email"]', 'testuser@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for the room selector
    await page.waitForSelector('button.room-card', { timeout: 10000 });
    console.log('Logged in successfully, clicking global chat...');
    
    // Click global chat
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.room-card'));
      const globalBtn = buttons.find(b => b.textContent.includes('Global Chat'));
      if (globalBtn) globalBtn.click();
    });

    // Wait a bit to catch errors
    await new Promise(r => setTimeout(r, 5000));
    console.log('Test completed');
    
  } catch (err) {
    console.error('TEST SCRIPT ERROR:', err);
  } finally {
    await browser.close();
  }
})();
