# Privacy Policy for Lock-In

**Last Updated:** December 5, 2024

## Introduction

Lock-In ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application ("App").

## Information We Collect

### Health and Fitness Data
- **Steps**: Daily step count
- **Sleep**: Hours of sleep per day
- **Active Calories**: Calories burned through physical activity
- **Workouts**: Number of workouts completed
- **Distance**: Miles walked/run

**How We Collect It:**
- We access this data through Apple HealthKit on iOS devices
- You must explicitly grant permission for us to access this data
- We only read this data; we do not write to your HealthKit database

### Account Information
- **Email Address**: Used for account creation and authentication
- **Username**: Display name in leagues (optional, can be changed)
- **User ID**: Unique identifier (UUID) for your account

### League Data
- **League Membership**: Which leagues you join
- **Scores**: Your weekly fitness scores and points
- **Matchup Results**: Win/loss/tie records
- **Standings**: Your position in league rankings

### Technical Data
- **Device Information**: Device type, operating system version
- **App Usage**: Features you use, errors encountered
- **Push Notification Token**: To send you notifications (optional)

## How We Use Your Information

### Primary Uses
1. **Fitness Competition**: Calculate your scores and compare them with other league members
2. **League Management**: Display standings, matchups, and results
3. **Notifications**: Send you updates about your matchups, league activity, and app updates
4. **App Functionality**: Provide core features like creating/joining leagues

### Data Processing
- Health data is processed locally on your device
- Only aggregated scores (total points, weekly totals) are stored on our servers
- Raw health data (individual step counts, sleep hours) is never transmitted to our servers
- Scores are calculated using league-specific scoring rules

## Data Storage and Security

### Where Data is Stored
- **User Accounts**: Stored securely in Supabase (PostgreSQL database)
- **Health Data**: Stored locally on your device via Apple HealthKit
- **Scores**: Stored in our database, linked to your user ID (UUID)

### Security Measures
- All data transmission is encrypted (HTTPS/TLS)
- User authentication via Supabase Auth (industry-standard security)
- Database access controlled by Row-Level Security (RLS) policies
- Health data never leaves your device except as aggregated scores

### Data Retention
- Account data: Retained until you delete your account
- Health data: Managed by Apple HealthKit (you control this)
- League scores: Retained for historical records (can be deleted with account)

## Data Sharing and Disclosure

### Shared with League Members
When you join a league, other members can see:
- Your **username** (not your email)
- Your **weekly scores** and **total points**
- Your **win/loss/tie record**
- Your **standings position**

**What is NOT Shared:**
- Your email address
- Your raw health data (steps, sleep hours, etc.)
- Your individual daily metrics
- Your account information

### Third-Party Services
We use the following third-party services:

1. **Supabase** (Backend Services)
   - Database hosting
   - User authentication
   - Real-time data synchronization
   - Privacy Policy: https://supabase.com/privacy

2. **Apple HealthKit** (Health Data)
   - Health data access (read-only)
   - Data remains on your device
   - Privacy Policy: https://www.apple.com/privacy/

3. **Expo** (App Development Platform)
   - App building and distribution
   - Privacy Policy: https://expo.dev/privacy

### We Do NOT:
- Sell your data to third parties
- Share your email address with other users
- Use your data for advertising
- Share raw health data with anyone

## Your Rights and Choices

### Access and Control
- **View Your Data**: Access your profile, scores, and league data in the app
- **Update Information**: Change your username, email, or avatar
- **Delete Account**: Request account deletion (removes all your data)
- **Health Data**: Control via Apple Health app settings

### HealthKit Permissions
- You can revoke HealthKit access at any time in iOS Settings → Privacy & Security → Health → Lock-In
- Revoking access will disable health data sync (app will use simulated data)

### Data Deletion
To delete your account:
1. Go to Settings in the app
2. Contact support or use account deletion feature
3. All your data will be permanently deleted within 30 days

## Children's Privacy

Lock-In is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.

## Health Data Specifics

### Apple HealthKit Integration
- **Read-Only Access**: We only read your health data; we never write to HealthKit
- **Explicit Consent**: iOS requires you to explicitly grant permission
- **Granular Permissions**: You can grant/deny access to each data type individually
- **Local Processing**: Health data is processed on your device before sending scores

### What Health Data We Access
- Steps (read)
- Sleep Analysis (read)
- Active Energy Burned (read)
- Distance Walking/Running (read)
- Workouts (read)

### What We Store
- **Aggregated Scores Only**: Total points, weekly totals
- **Not Raw Data**: We do not store individual step counts, sleep hours, etc.
- **League Context**: Scores are stored per league/week for competition purposes

## International Users

If you are using Lock-In from outside the United States, please note that your data may be transferred to, stored, and processed in the United States where our servers are located.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:
- Posting the new Privacy Policy in the app
- Updating the "Last Updated" date
- Sending you a notification (for material changes)

## Contact Us

If you have questions about this Privacy Policy or our data practices, please contact us:

**Email:** [Your support email]
**Website:** [Your website URL]

## Compliance

- **HIPAA**: We are not a covered entity under HIPAA, but we treat health data with similar care
- **GDPR**: We comply with GDPR for EU users (right to access, delete, portability)
- **CCPA**: We comply with CCPA for California users
- **Apple Guidelines**: We follow Apple's HealthKit guidelines and App Store requirements

---

## Summary

**What we collect:**
- Health data (via Apple HealthKit, with your permission)
- Email and username (for account)
- League scores and standings

**What we share:**
- Username and scores with league members only
- No email addresses
- No raw health data

**Your control:**
- Revoke HealthKit access anytime
- Delete your account anytime
- Change your username anytime

**Security:**
- Encrypted data transmission
- Secure database storage
- Health data stays on your device

