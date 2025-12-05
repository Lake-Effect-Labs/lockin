# 📊 Analytics Setup Guide

## Where to Monitor Analytics

After setting up analytics, you'll monitor your data in the **web dashboard** of your chosen analytics provider:

### **PostHog Dashboard** (Recommended)
- **URL**: https://app.posthog.com
- **What you'll see**:
  - Real-time event stream
  - User journeys and funnels
  - Retention charts
  - Feature flags
  - Session recordings (optional)
- **Free tier**: 1M events/month
- **Best for**: Privacy-focused, open source, great for startups

### **Firebase Analytics Dashboard**
- **URL**: https://console.firebase.google.com
- **What you'll see**:
  - User engagement metrics
  - Event counts and trends
  - User properties
  - Conversion funnels
  - Custom reports
- **Free tier**: Unlimited events
- **Best for**: Easy setup, integrates with other Firebase services

### **Mixpanel Dashboard**
- **URL**: https://mixpanel.com
- **What you'll see**:
  - Event tracking with properties
  - User segmentation
  - Funnel analysis
  - Retention reports
  - A/B testing
- **Free tier**: 20M events/month
- **Best for**: Detailed event tracking and user behavior analysis

### **Amplitude Dashboard**
- **URL**: https://analytics.amplitude.com
- **What you'll see**:
  - User behavior charts
  - Event segmentation
  - Retention analysis
  - User paths
  - Real-time data
- **Free tier**: 10M events/month
- **Best for**: Beautiful dashboards, great for product analytics

---

## Quick Setup Instructions

### Option 1: PostHog (Recommended)

1. **Sign up**: https://posthog.com (free)
2. **Get API key**: Project Settings → Project API Key
3. **Install**:
   ```bash
   npm install posthog-react-native
   ```
4. **Update `services/analytics.ts`**:
   ```typescript
   import PostHog from 'posthog-react-native';
   
   async initialize(userId?: string) {
     PostHog.setup('YOUR_API_KEY', {
       host: 'https://app.posthog.com',
     });
     this.initialized = true;
     if (userId) this.identify(userId);
   }
   
   identify(userId: string, traits?: { email?: string; username?: string }) {
     PostHog.identify(userId, traits);
   }
   
   track(eventName: string, properties?: Record<string, any>) {
     PostHog.capture(eventName, properties);
   }
   
   reset() {
     PostHog.reset();
   }
   ```
5. **Initialize in `app/_layout.tsx`**:
   ```typescript
   import { analytics } from '@/services/analytics';
   
   useEffect(() => {
     if (user?.id) {
       analytics.initialize(user.id);
       analytics.identify(user.id, { email: user.email, username: user.username });
     }
   }, [user?.id]);
   ```

### Option 2: Firebase Analytics

1. **Create Firebase project**: https://console.firebase.google.com
2. **Add iOS/Android apps** to your Firebase project
3. **Install**:
   ```bash
   npx expo install expo-firebase-analytics
   ```
4. **Update `app.json`**:
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-firebase-analytics",
           {
             "ios": {
               "googleServicesFile": "./GoogleService-Info.plist"
             },
             "android": {
               "googleServicesFile": "./google-services.json"
             }
           }
         ]
       ]
     }
   }
   ```
5. **Update `services/analytics.ts`**:
   ```typescript
   import * as Analytics from 'expo-firebase-analytics';
   
   async initialize(userId?: string) {
     await Analytics.setAnalyticsCollectionEnabled(true);
     this.initialized = true;
     if (userId) this.identify(userId);
   }
   
   identify(userId: string, traits?: { email?: string; username?: string }) {
     Analytics.setUserId(userId);
     if (traits?.email) Analytics.setUserProperties({ email: traits.email });
   }
   
   track(eventName: string, properties?: Record<string, any>) {
     Analytics.logEvent(eventName, properties);
   }
   
   reset() {
     Analytics.setUserId(null);
   }
   ```

---

## What Events Are Tracked

The app automatically tracks these key events:

### **User Actions**
- `user_signed_up` - When a user creates an account
- `user_signed_in` - When a user logs in
- `user_signed_out` - When a user logs out

### **League Actions**
- `league_created` - When a league is created (with season length, max players, scoring config)
- `league_joined` - When a user joins a league (with join method)
- `league_left` - When a user leaves a league
- `league_full` - When a league reaches max capacity

### **Matchup Actions**
- `matchup_viewed` - When a user views a matchup
- `matchup_won` - When a user wins a matchup (with score)
- `matchup_lost` - When a user loses a matchup (with score)

### **Playoff Actions**
- `playoffs_started` - When playoffs begin in a league
- `champion_crowned` - When a champion is determined

### **Health Data**
- `health_data_synced` - When health data is synced (with metrics present)

---

## Example Dashboard Views

### **PostHog Dashboard**
```
📊 Events
├── league_created: 45 events
├── league_joined: 120 events
├── matchup_viewed: 1,234 events
└── champion_crowned: 3 events

👥 Users
├── Active users (7d): 234
├── New users (7d): 45
└── Retention (D7): 32%

📈 Funnels
├── Sign Up → Create League: 45%
├── Join League → View Matchup: 78%
└── View Matchup → Win Matchup: 12%
```

### **Firebase Analytics Dashboard**
```
📊 Events (Last 7 days)
├── league_created: 45
├── league_joined: 120
└── matchup_viewed: 1,234

👥 User Engagement
├── Daily Active Users: 234
├── Weekly Active Users: 567
└── Monthly Active Users: 1,234

📱 User Properties
├── Average leagues per user: 2.3
└── Average matchups viewed: 5.2
```

---

## Key Metrics to Monitor

### **Engagement Metrics**
- **Daily Active Users (DAU)**: Users who open the app daily
- **Weekly Active Users (WAU)**: Users active in the past week
- **Session Duration**: How long users spend in the app
- **Screen Views**: Which screens are most popular

### **League Metrics**
- **Leagues Created**: Total leagues created
- **Average League Size**: Average players per league
- **League Completion Rate**: % of leagues that finish the season
- **Time to Full League**: How long it takes leagues to fill up

### **Matchup Metrics**
- **Matchups Viewed**: How often users check their matchups
- **Win Rate**: % of matchups won by users
- **Average Score**: Average points per matchup
- **Engagement by Week**: Which weeks have most activity

### **Retention Metrics**
- **D1 Retention**: % of users who return the next day
- **D7 Retention**: % of users who return after 7 days
- **D30 Retention**: % of users who return after 30 days

---

## Privacy & Compliance

- **GDPR Compliant**: PostHog and Firebase are GDPR compliant
- **User Consent**: Consider adding a consent banner for EU users
- **Data Retention**: Configure retention policies in your analytics provider
- **PII**: Don't track personally identifiable information (emails are hashed)

---

## Next Steps

1. Choose an analytics provider (PostHog recommended)
2. Follow setup instructions above
3. Test events in development mode
4. Check dashboard after a few days of usage
5. Set up alerts for key metrics (e.g., drop in DAU)

---

## Need Help?

- **PostHog Docs**: https://posthog.com/docs
- **Firebase Docs**: https://firebase.google.com/docs/analytics
- **Mixpanel Docs**: https://developer.mixpanel.com/docs/react-native
- **Amplitude Docs**: https://www.docs.developers.amplitude.com/data/sdks/react-native/

