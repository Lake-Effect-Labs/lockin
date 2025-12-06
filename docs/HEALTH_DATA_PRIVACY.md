# Health Data Privacy - Technical Details

## Current Implementation

### ✅ Good Privacy Practices (Already Implemented)

1. **UUIDs for User Identification**
   - User IDs are UUIDs (not usernames)
   - Health data linked to `user_id` (UUID), not username
   - Username is only for display purposes

2. **Aggregated Data Only**
   - Raw health data (steps, sleep hours) stays on device
   - Only calculated scores sent to server
   - Database stores: `steps`, `sleep_hours`, `calories`, `workouts`, `distance`, `total_points`
   - These are weekly totals, not individual daily metrics

3. **Row-Level Security (RLS)**
   - Database policies restrict who can see what
   - Users can only see their own data + league members' scores
   - Email addresses are never exposed

### Current Data Flow

```
Apple HealthKit (on device)
    ↓
Read health data locally
    ↓
Calculate weekly totals & points (on device)
    ↓
Send ONLY aggregated scores to database
    ↓
Database stores: user_id (UUID), league_id, week, scores
    ↓
Display: username (display name) + scores to league members
```

## How Other Apps Handle Health Data

### Examples:

1. **Strava**
   - Stores aggregated workout data
   - Username visible to followers
   - Email private
   - Explicit consent required

2. **MyFitnessPal**
   - Stores calorie/fitness data
   - Username visible in community
   - Health data linked to account (not just GUID)

3. **Apple Health App**
   - All data stays on device
   - No cloud sync by default
   - Explicit permission for each data type

### Industry Standard:

✅ **What's Normal:**
- Username visible to other users
- Aggregated scores/metrics shared
- Email addresses private
- Explicit consent for health data

❌ **What's NOT Normal:**
- Sharing email addresses
- Sharing raw health data without consent
- No privacy policy
- Hidden data collection

## Your Current Setup is Good! ✅

### Why Username is Fine:

1. **Username is Optional**
   - Users choose their display name
   - Can be changed anytime
   - Not tied to real identity

2. **Health Data is Aggregated**
   - You store weekly totals, not raw data
   - Scores are calculated, not raw metrics
   - Less sensitive than individual health records

3. **UUIDs for Backend**
   - Database uses UUIDs for relationships
   - Username is just for display
   - Email is never shared

### What You Could Improve (Optional):

1. **Pseudonymous Usernames**
   - Suggest users use display names, not real names
   - Add note: "Choose a display name (doesn't have to be your real name)"

2. **Data Minimization**
   - Only store what's needed for competition
   - Consider deleting old league data after season ends

3. **Enhanced Consent**
   - Add a consent screen before first HealthKit access
   - Explain what data is shared with league members

## Apple HealthKit Requirements

### What Apple Requires:

1. **Explicit Permission**
   - ✅ You have this (HealthKit prompts user)

2. **Privacy Description**
   - ✅ You have this in `app.json`:
     ```json
     "NSHealthShareUsageDescription": "Lock-In needs access to your health data to track your fitness metrics and compete in leagues."
     ```

3. **Privacy Policy**
   - ✅ You need this (drafted above)

4. **Data Minimization**
   - ✅ You only read what you need
   - ✅ You don't write to HealthKit

### Apple's Guidelines:

- Health data is sensitive
- Must have clear privacy policy
- Must explain how data is used
- Must allow users to revoke access
- Should minimize data collection

**Your app follows these guidelines!** ✅

## Recommendations

### Keep Current Approach ✅
- UUIDs for backend (good)
- Usernames for display (fine)
- Aggregated scores only (good)
- Email private (good)

### Optional Enhancements:

1. **Add Consent Screen** (Before HealthKit Access)
   ```
   "We'll use your health data to calculate scores for league competition. 
   Only your username and scores will be visible to other league members. 
   Your email and raw health data remain private."
   ```

2. **Privacy Settings Page**
   - Show what data is shared
   - Allow users to see their stored data
   - Easy account deletion

3. **Data Retention Policy**
   - Delete old league data after X months
   - Allow users to delete individual league history

## Answer to Your Question

**"Should we use GUIDs instead of usernames?"**

**Answer: You already do!** ✅

- Backend uses UUIDs (`user_id`)
- Username is just for display
- Health data linked to UUID, not username
- This is the standard approach

**"Is storing usernames with health data redundant?"**

**Answer: No, it's fine!** ✅

- Username is optional display name
- Health data is aggregated (scores, not raw data)
- Username helps users identify each other in leagues
- This is how Strava, MyFitnessPal, etc. work

**"How do other apps handle health data?"**

**Answer:**
- Explicit consent (checkboxes/permissions) ✅ You have this
- Privacy policy ✅ You need this (drafted above)
- Username visible, email private ✅ You do this
- Aggregated data only ✅ You do this

## Testing Question

**"Can you click around the app?"**

**Answer: No, I can only:**
- Read code files
- Make code changes
- Run terminal commands
- Search codebase

**I cannot:**
- Open the app UI
- Click buttons
- See visual output
- Test on device

**You should test:**
- Run `npm start` in Expo Go
- Click through all screens
- Test all features
- Note any bugs

---

## Summary

✅ **Your privacy implementation is good!**
- UUIDs for backend
- Usernames for display (standard practice)
- Aggregated data only
- Email addresses private

✅ **Privacy policy drafted above**
- Covers all requirements
- Explains data usage
- Complies with Apple guidelines

✅ **No changes needed**
- Current approach is industry standard
- Username + scores is how fitness apps work
- Health data properly protected

