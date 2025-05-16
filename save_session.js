const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: './puppeteer_profile' // This saves your session
    });

    const page = await browser.newPage();
    await page.goto('https://mnregaweb4.nic.in/nregaarch/View_NMMS_atten_date_new.aspx?page=D&short_name=UP&state_name=UTTAR%20PRADESH&state_code=31&district_name=BASTI&district_code=3153&fin_year=2024-2025&AttendanceDate=31/03/2025&source=&Digest=ebKjCj4U7oFg7NTclfvy5A', { waitUntil: 'networkidle2' });

    console.log('Login manually if required, then close the browser.');
})();

