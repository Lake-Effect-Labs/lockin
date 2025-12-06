# Deployment & Hosting Guide

## Overview

Lock-In is a React Native app built with Expo. Here's how the hosting architecture works:

## Architecture

### Frontend (Mobile App)
- **Built with**: Expo/React Native
- **Distribution**: App Store (iOS)
- **No server needed**: The mobile app runs entirely on the user's device

### Backend Services

#### 1. **Supabase (Database & Auth)**
- **What it is**: Your backend-as-a-service (BaaS)
- **Hosting**: Fully managed by Supabase (no Vercel needed!)
- **What it provides**:
  - PostgreSQL database (hosted on Supabase)
  - Authentication (email/password, magic links)
  - Real-time subscriptions
  - Row-Level Security (RLS) policies
  - API endpoints (auto-generated from your database)
- **Cost**: Free tier available, scales as you grow
- **Location**: Supabase manages all infrastructure

#### 2. **Expo Application Services (EAS)**
- **What it is**: Expo's build and deployment service
- **What it provides**:
  - Builds your iOS app for App Store submission
  - Manages app updates (OTA updates for non-native changes)
  - Handles code signing certificates
- **Cost**: Free tier available, pay for builds

## Deployment Steps

### 1. **Set Up Supabase** (Already Done ✅)
- Your database is already configured
- Migrations are in `supabase/migrations/`
- Environment variables are in `.env`

### 2. **Build for App Store**

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS (if not already done)
eas build:configure

# Build for iOS App Store
eas build --platform ios --profile production
```

This will:
- Build your app with native modules (HealthKit, etc.)
- Generate an `.ipa` file ready for App Store submission
- Handle code signing automatically

### 3. **Submit to App Store**

```bash
# Submit directly to App Store (requires App Store Connect setup)
eas submit --platform ios
```

Or manually:
1. Download the `.ipa` from EAS
2. Use Xcode or Transporter to upload to App Store Connect
3. Complete submission in App Store Connect

### 4. **Update Your App** (After Launch)

For code changes (JavaScript/TypeScript):
```bash
# Publish OTA update (no App Store review needed!)
eas update --branch production --message "Bug fixes"
```

For native changes (new dependencies, HealthKit changes, etc.):
```bash
# Requires new build + App Store review
eas build --platform ios --profile production
eas submit --platform ios
```

## What About Vercel/Other Hosting?

**You DON'T need Vercel or any other hosting service!**

Here's why:
- ✅ **Supabase** hosts your database and API (no server code needed)
- ✅ **Expo** builds and distributes your app
- ✅ **App Store** hosts the app download
- ✅ **User's device** runs the app

The only things you might want to host separately:
- **Landing page** (optional) - Could use Vercel/Netlify for a marketing site
- **Admin dashboard** (optional) - Could use Vercel for a web admin panel

But for the core app functionality, everything is handled by Supabase + Expo.

## Cost Breakdown

### Free Tier (Good for Starting)
- **Supabase**: Free tier includes:
  - 500MB database
  - 2GB bandwidth
  - 50,000 monthly active users
  - Unlimited API requests
- **EAS**: Free tier includes:
  - Unlimited builds (with queue limits)
  - OTA updates
- **App Store**: $99/year developer account

### Scaling Costs
- **Supabase**: Pay-as-you-go after free tier
  - Database: ~$25/month for 8GB
  - Bandwidth: $0.09/GB after free tier
- **EAS**: Pay for faster builds ($29/month for priority queue)

## Environment Variables

Make sure these are set in your production builds:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-production-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

Set these in EAS:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value your-url
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-key
```

## HealthKit Setup

Since you're iOS-only:
- HealthKit permissions are configured in `app.json`
- Users will be prompted to grant permissions on first launch
- Garmin watch data syncs to Apple Health automatically (no extra setup needed)

## Monitoring & Analytics

Consider adding:
- **Sentry** (error tracking) - Free tier available
- **Expo Analytics** (usage metrics) - Built into Expo
- **Supabase Dashboard** (database monitoring) - Built into Supabase

## Summary

**TL;DR**: 
- ✅ Supabase = Your backend (no Vercel needed)
- ✅ Expo EAS = Builds and updates your app
- ✅ App Store = Distributes your app
- ✅ User's iPhone = Runs your app

No traditional "server" hosting required! Everything is serverless/managed.

