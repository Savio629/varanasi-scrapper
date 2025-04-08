# 🛠️ Scrape Two Weeks Data (Automated with GitHub Actions)

This project contains a GitHub Actions workflow to scrape and process attendance data from Supabase.

## 📂 Files

- `index.js` — Fetches and processes `attendance_data` from Supabase.
- `eval-index.js` — Runs post-processing or evaluation on the fetched data.

---

## ⚙️ GitHub Workflow: `.github/workflows/scrape.yml`

The workflow is configured to:

- Run **daily at 8:00 AM IST (2:30 AM UTC)** automatically.
- Support **manual runs** via the GitHub UI.
- Execute both `index.js` and `eval-index.js` sequentially.

---

## 🕰️ Cron Schedule

GitHub Actions uses **UTC** for cron jobs. To run the workflow at **8:00 AM IST**, the following schedule is set:

```yaml
schedule:
  - cron: '30 2 * * *'  # Runs daily at 2:30 AM UTC (8:00 AM IST)
```

## 🧪 Manual Trigger

You can trigger the workflow manually via the Actions tab:

- Select Scrape Two Weeks Data workflow.

- Click on Run workflow.

## 🚀 Local Installation & Usage

If you want to run the scraper scripts locally on your machine:

### 1. Clone the repository

### 2. Install dependencies
```
npm install
```

### 3. Set up environment variables

### 4. Run the scripts manually
 
Run the main scraper:
```
node index.js
```

Run the evaluation script:
```
node eval-index.js
```
