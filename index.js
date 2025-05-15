require('dotenv').config();
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-software-rasterizer'
        ]
    });

    const page = await browser.newPage();

    try {
        const url = "https://mnregaweb4.nic.in/nregaarch/View_NMMS_atten_date_new.aspx?page=D&short_name=UP&state_name=UTTAR%20PRADESH&state_code=31&district_name=BASTI&district_code=3153&fin_year=2024-2025&AttendanceDate=31/03/2025&source=&Digest=ebKjCj4U7oFg7NTclfvy5A";
        console.log(`Opening URL: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        const dropdownSelector = '#ContentPlaceHolder1_ddl_attendance';
        await page.waitForSelector(dropdownSelector);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const yyyy = yesterday.getFullYear();
        const formattedDate = `${dd}/${mm}/${yyyy}`;

        const selectedDate = await page.evaluate((selector, targetDate) => {
            const dropdown = document.querySelector(selector);
            const options = Array.from(dropdown.options).map(option => option.value);
            return options.includes(targetDate) ? targetDate : null;
        }, dropdownSelector, formattedDate);

        if (!selectedDate) {
            console.log(`Date ${formattedDate} not found in dropdown. Exiting...`);
            await browser.close();
            return;
        }

        console.log(`Processing only for previous date: ${selectedDate}`);

        const dateValue = selectedDate;
        await page.select(dropdownSelector, dateValue);
        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.waitForSelector('#RepPr1 table tbody');

        const rows = await page.evaluate(() => {
            const table = document.querySelector('#RepPr1 table tbody');
            if (!table) return [];
            return Array.from(table.querySelectorAll('tr'))
                .map(row => {
                    const blockCell = row.cells[3];
                    const link = blockCell ? blockCell.querySelector('a') : null;
                    return link ? { blockName: link.textContent.trim(), href: link.href } : null;
                })
                .filter(row => row !== null);
        });

        if (rows.length === 0) {
            console.log(`No links found for date: ${dateValue}`);
        } else {
            console.log(`Found ${rows.length} links for date: ${dateValue}`);

            for (const { blockName, href } of rows) {
                console.log(`Processing link for block: ${blockName} - ${href}`);
                const newPage = await browser.newPage();
                await newPage.goto(href, { waitUntil: 'networkidle2' });

                await newPage.waitForSelector('#RepPr1 table tbody');

                const tableData = await newPage.evaluate((date) => {
                    const table = document.querySelector('#RepPr1 table tbody');
                    if (!table) return [];
                    const rows = table.querySelectorAll('tr');
                    return Array.from(rows).map((row, index) => {
                        const cells = row.querySelectorAll('td');
                        return {
                            s_no: cells[0]?.textContent.trim() || (index + 1).toString(),
                            district: cells[1]?.textContent.trim() || 'BASTI',
                            block: cells[2]?.textContent.trim() || '',
                            panchayat: cells[3]?.textContent.trim() || '',
                            work_code: cells[4]?.textContent.trim() || '',
                            mustroll_no: cells[5]?.querySelector('a')?.textContent.trim() || cells[5]?.textContent.trim() || '',
                            persondays_generated: cells[6]?.textContent.trim() || '',
                            attendance_date: date
                        };
                    });
                }, dateValue);

                if (tableData.length > 0) {
                    console.log(`Extracted ${tableData.length} rows from ${blockName} for date ${dateValue}`);

                    const { error: insertError } = await supabase
                        .from('attendance_data')
                        .insert(tableData);

                    if (insertError) {
                        console.error(`Error inserting data for ${blockName} on ${dateValue}:`, insertError);
                    } else {
                        console.log(`Successfully stored ${tableData.length} rows for ${blockName} on ${dateValue}`);
                    }
                } else {
                    console.log(`No table data found for ${blockName} on ${dateValue}`);
                }
                await newPage.close();
            }
        }

        console.log("All links processed and data extracted.");

    } catch (error) {
        console.error("An error occurred:", error);
    } finally {
        await browser.close();
    }
})();
