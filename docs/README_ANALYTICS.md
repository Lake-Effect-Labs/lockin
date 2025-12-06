# 📊 Local Analytics Dashboard

A simple, self-hosted analytics dashboard that queries your Supabase database directly.

## 🚀 Quick Start

### Option 1: Open HTML File Directly

1. Open `analytics-dashboard/index.html` in your browser
2. Enter your Supabase URL and Anon Key
3. Click "Connect & Load Data"
4. View your analytics!

### Option 2: Run with Local Server (Recommended)

```bash
# Using Python
cd analytics-dashboard
python -m http.server 8000

# Using Node.js
npx http-server analytics-dashboard -p 8000

# Using PHP
php -S localhost:8000 -t analytics-dashboard
```

Then open: http://localhost:8000

## 📋 What It Shows

### **Overview Stats**
- Total Users
- Total Leagues
- Active Leagues
- Total Matchups
- Leagues Created (Last 7 Days)
- New Users (Last 7 Days)

### **Recent Leagues**
- Latest 10 leagues created
- Creation date
- Current player count
- Status (Active/Waiting)

### **League Size Distribution**
- Breakdown by max players (4, 6, 8, 10, 12, 14)
- Count and percentage

### **User Activity (Last 7 Days)**
- Daily new users
- Daily leagues created
- Daily leagues joined

## 🔒 Security

- **No data stored**: All queries run directly against Supabase
- **Uses Anon Key**: Safe for read-only operations
- **Local only**: Runs entirely in your browser
- **No tracking**: No third-party analytics

## 🔧 Customization

Edit `analytics-dashboard/index.html` to:
- Add more metrics
- Change date ranges
- Add charts (using Chart.js)
- Customize styling

## 📊 Example Queries

The dashboard uses these Supabase queries:

```javascript
// Get all users
supabase.from('users').select('id, created_at')

// Get all leagues
supabase.from('leagues').select('*')

// Get all matchups
supabase.from('matchups').select('id')

// Get league members
supabase.from('league_members').select('league_id, user_id, joined_at')
```

## 🎯 Future Enhancements

You could add:
- Charts/graphs (Chart.js, D3.js)
- Export to CSV
- Date range picker
- More detailed metrics
- User retention analysis
- League completion rates

## 💡 Tips

- **Refresh**: Click "Connect & Load Data" to refresh
- **Config saved**: Your Supabase credentials are saved in localStorage
- **Privacy**: All data stays local, never sent anywhere

