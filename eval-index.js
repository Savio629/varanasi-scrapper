require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const getYesterdayFormatted = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dd = String(yesterday.getDate()).padStart(2, '0');
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
    const yyyy = yesterday.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
};

(async () => {
    try {
        const targetDate = getYesterdayFormatted();

        console.log(`Fetching records for date: ${targetDate}`);

        const pageSize = 1000;
        let allData = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('attendance_data')
                .select('attendance_date, block, panchayat, work_code, persondays_generated')
                .eq('attendance_date', targetDate)
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) {
                console.error('Error fetching data:', error);
                return;
            }

            if (!data || data.length === 0) {
                hasMore = false;
            } else {
                allData = allData.concat(data);
                page++;
            }
        }

        console.log(`Fetched ${allData.length} records for ${targetDate}.`);

        if (allData.length === 0) {
            console.log('No data found for the previous date.');
            return;
        }

        const groupedData = {};
        for (const entry of allData) {
            const { block, panchayat, work_code, persondays_generated } = entry;

            const persondays = parseInt(persondays_generated, 10) || 0;
            const blockKey = `${block}`;
            const workKey = `${panchayat}|${work_code}`;

            if (!groupedData[blockKey]) groupedData[blockKey] = {};
            if (!groupedData[blockKey][workKey]) {
                groupedData[blockKey][workKey] = {
                    panchayat,
                    work_code,
                    total_persondays: 0
                };
            }

            groupedData[blockKey][workKey].total_persondays += persondays;
        }

        const summarizedData = [];
        for (const [block, works] of Object.entries(groupedData)) {
            const workEntries = Object.values(works);
            const maxPersondays = Math.max(...workEntries.map(w => w.total_persondays));
            const highestWorks = workEntries.filter(w => w.total_persondays === maxPersondays);

            for (const work of highestWorks) {
                summarizedData.push({
                    date: targetDate,
                    block,
                    panchayat: work.panchayat,
                    work_code: work.work_code,
                    number_of_workers_employed: work.total_persondays
                });
            }
        }

        console.log(`Prepared ${summarizedData.length} records for insertion.`);

        const batchSize = 500;
        for (let i = 0; i < summarizedData.length; i += batchSize) {
            const batch = summarizedData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
                .from('highest_personday_works')
                .insert(batch);

            if (insertError) {
                console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
            } else {
                console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records).`);
            }
        }

        console.log(`✅ Completed inserting ${summarizedData.length} records for ${targetDate}.`);

    } catch (error) {
        console.error('An unexpected error occurred:', error);
    }
})();
