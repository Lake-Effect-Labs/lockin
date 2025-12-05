# 🔥 Lock-In - Fitness Competition App

A fantasy-football-style fitness league app built with React Native + Expo. Compete with friends in head-to-head weekly matchups based on your fitness metrics!

## 📱 Features

- **League System**: Create or join leagues with friends using unique codes
- **Weekly Matchups**: Automatic head-to-head matchup scheduling
- **Fitness Scoring**: Points based on steps, sleep, calories, workouts, and distance
- **Playoffs**: Top 4 players compete in semifinals and finals
- **Cross-Platform Health**: Apple HealthKit (iOS) and Health Connect (Android)
- **Fake Data Mode**: Test on Windows/web without health hardware
- **Push Notifications**: Get notified about matchup results and playoffs

## 🏗️ Tech Stack

- **Frontend**: React Native 0.74+, Expo SDK 51
- **Navigation**: Expo Router
- **State**: Zustand + React Query
- **Backend**: Supabase (Postgres + Auth + RLS)
- **Health**: expo-health-connect (Android), react-native-health (iOS)
- **Build**: EAS Build & Submit

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase account

### 1. Clone and Install

```bash
# Clone the repo
cd lock-in

# Install dependencies
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migrations:
   - Go to SQL Editor in Supabase Dashboard
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Run the SQL

3. Get your API keys from Project Settings > API

4. Create `.env` file:
```bash
cp env.example .env
```

5. Fill in your Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run on Windows (Development)

```bash
# Start Expo dev server
npm start

# Or start with tunnel for phone testing
npx expo start --tunnel
```

The app will run in **Fake Data Mode** automatically on Windows/web since health APIs aren't available.

### 4. Test on iPhone with Expo Go

1. Install **Expo Go** from App Store
2. Start the dev server: `npm start`
3. Scan the QR code with your iPhone camera
4. The app will open in Expo Go

**Note**: Health data requires a development build (see below).

### 5. Test on Android with Expo Go

1. Install **Expo Go** from Play Store
2. Start the dev server: `npm start`
3. Scan the QR code with Expo Go app

## 📊 Scoring System

| Metric | Points |
|--------|--------|
| Steps | 1 point per 1,000 steps |
| Sleep | 2 points per hour |
| Active Calories | 5 points per 100 calories |
| Workouts | 20 points per workout |
| Distance | 3 points per mile |

## 🧪 Fake Data Mode

For development on Windows or testing without health hardware:

1. Go to **Settings** in the app
2. Enable **Fake Data Mode**
3. The app will generate realistic mock fitness data

This is automatically enabled when health APIs aren't available.

## 📱 Building for Production

### Setup EAS

```bash
# Login to Expo
eas login

# Configure project
eas build:configure
```

### Build for iOS

```bash
# Development build (for testing health features)
eas build --platform ios --profile development

# Production build
eas build --platform ios --profile production
```

### Build for Android

```bash
# Development build
eas build --platform android --profile development

# Production build  
eas build --platform android --profile production
```

### Submit to App Stores

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## 🏥 Health Permissions

### iOS (HealthKit)

Health permissions are configured in `app.json`:
- Steps
- Sleep Analysis
- Active Energy Burned
- Distance Walking/Running
- Workouts

Users will be prompted to grant access on first launch.

### Android (Health Connect)

Required permissions in `app.json`:
- Steps
- Sleep Sessions
- Active Calories Burned
- Distance
- Exercise Sessions

Users need Health Connect app installed.

## 📁 Project Structure

```
lock-in/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Login, Register
│   ├── (app)/             # Main app screens
│   │   ├── home.tsx       # Dashboard
│   │   ├── create-league.tsx
│   │   ├── join-league.tsx
│   │   ├── settings.tsx
│   │   └── league/[leagueId]/
│   │       ├── index.tsx  # League dashboard
│   │       ├── matchup.tsx
│   │       ├── standings.tsx
│   │       └── playoffs.tsx
│   └── index.tsx          # Entry/splash
├── components/            # Reusable UI components
├── services/              # API and business logic
│   ├── supabase.ts       # Database client
│   ├── health.ts         # Health data integration
│   ├── scoring.ts        # Points calculation
│   ├── playoffs.ts       # Playoff engine
│   ├── notifications.ts  # Push notifications
│   └── league.ts         # League management
├── store/                 # Zustand stores
├── utils/                 # Utilities
│   ├── colors.ts         # Theme colors
│   ├── dates.ts          # Date helpers
│   └── fakeData.ts       # Mock data generator
└── supabase/             # Database migrations
```

## 🗄️ Database Schema

### Tables

- **users**: User profiles
- **leagues**: League configurations
- **league_members**: Membership with stats
- **matchups**: Weekly head-to-head matchups
- **weekly_scores**: Fitness metrics per week
- **playoffs**: Playoff bracket matches
- **notifications**: Push notification history

### Key Functions

- `generate_matchups()`: Creates round-robin schedule
- `finalize_week()`: Processes week-end scoring
- `generate_playoffs()`: Sets up playoff bracket
- `finalize_playoff_match()`: Advances playoff rounds

## 🔒 Security

- Row Level Security (RLS) on all tables
- Users can only view leagues they're members of
- Scores can only be updated by the owning user
- League settings only editable by creator

## 🎨 Customization

### Colors

Edit `utils/colors.ts` to customize the theme:
- Primary: Orange/red (#FF6B35)
- Secondary: Navy blue
- Accent: Green for wins

### Scoring

Modify constants in `services/scoring.ts`:
```typescript
export const SCORING_CONFIG = {
  POINTS_PER_1000_STEPS: 1,
  POINTS_PER_SLEEP_HOUR: 2,
  POINTS_PER_100_ACTIVE_CAL: 5,
  POINTS_PER_WORKOUT: 20,
  POINTS_PER_MILE: 3,
};
```

## 🐛 Troubleshooting

### "Health data not available"
- On Windows/web: Enable Fake Data Mode in settings
- On iOS: Ensure HealthKit permissions are granted
- On Android: Install Health Connect app

### "Cannot connect to Supabase"
- Check `.env` file has correct credentials
- Ensure Supabase project is running
- Check network connectivity

### Build fails
- Run `npx expo-doctor` to check for issues
- Clear cache: `npx expo start -c`
- Reinstall: `rm -rf node_modules && npm install`

## 📄 License

MIT License - feel free to use for your own projects!

## 🤝 Contributing

1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

---

Built with ❤️ using React Native + Expo

