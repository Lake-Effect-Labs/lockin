# 📊 Ad Revenue Guide for Lock-In

## Revenue Potential

Based on 2024 mobile ad rates:

### Estimated Monthly Revenue (100,000 MAU)
- **Conservative**: $5,000/month ($0.05 per user)
- **Average**: $25,000/month ($0.25 per user)
- **Optimistic**: $100,000+/month ($1+ per user)

### CPM Rates (Cost Per 1,000 Impressions)
- **Banner Ads**: $0.50 - $5.00
- **Interstitial Ads**: $2.00 - $10.00
- **Rewarded Video**: $5.00 - $20.00

### Factors Affecting Revenue
1. **User Engagement**: Fitness apps have high engagement → higher rates
2. **Geographic Location**: US/UK users = 3-5x higher rates than developing countries
3. **Ad Format**: Rewarded videos pay 5-10x more than banners
4. **Ad Network**: Google AdMob, Facebook Audience Network, Unity Ads

## Implementation Strategy

### Current Setup
- ✅ Dismissible banner ads
- ✅ Frequency capping (max 3 ads/day)
- ✅ Placement-based probability (30-50% chance per screen)
- ✅ Non-intrusive design matching app theme

### Ad Placements
1. **Home Screen**: After leagues list (30% chance)
2. **League Dashboard**: Between matchup and stats (40% chance)
3. **Matchup Screen**: After matchup card (50% chance)
4. **Standings Screen**: After standings list (30% chance)

### Best Practices Implemented
- ✅ Users can dismiss ads with X button
- ✅ Max 3 ads per day per user (prevents ad fatigue)
- ✅ Native-style design (matches app UI)
- ✅ Strategic placement (not blocking content)

## Next Steps to Maximize Revenue

### 1. Set Up Real Ad Network
Replace mock ads with real ad SDK:

```bash
# Already installed: react-native-google-mobile-ads
# Need to configure in app.json and get AdMob account
```

**AdMob Setup:**
1. Create account at https://admob.google.com
2. Create ad units (banner, interstitial, rewarded)
3. Add unit IDs to environment variables
4. Update `AdBanner.tsx` to use real ad SDK

### 2. Add More Ad Formats
- **Rewarded Videos**: "Watch ad to see detailed stats" (highest revenue)
- **Interstitial**: Full-screen between screens (higher revenue than banners)
- **Native Ads**: Sponsored content matching app design

### 3. A/B Testing
- Test different frequencies (2-5 ads/day)
- Test different placements
- Test ad formats (banner vs interstitial vs rewarded)

### 4. Premium Option
Offer ad-free version:
- One-time purchase: $2.99
- Monthly subscription: $0.99/month
- Annual subscription: $9.99/year

## Revenue Projections

### Conservative Estimate (100,000 MAU)
- 3 ads/day × 30 days = 90 ads/user/month
- 100,000 users × 90 ads = 9M impressions/month
- 9M impressions ÷ 1000 × $1 CPM = **$9,000/month**

### Average Estimate
- Same impressions with $2.50 CPM = **$22,500/month**

### Optimistic Estimate (with rewarded videos)
- Mix of formats averaging $5 CPM = **$45,000/month**

## Implementation Notes

The current implementation uses:
- Mock ads (placeholder) until real ad SDK is configured
- Frequency capping via AsyncStorage
- Dismissible ads (once per day)
- Smart placement based on screen type

To activate real ads:
1. Get AdMob account and ad unit IDs
2. Update `AdBanner.tsx` to use `react-native-google-mobile-ads`
3. Test with test ad units first
4. Monitor revenue and adjust frequency/placement

## User Experience

Ads are designed to:
- ✅ Not interrupt core functionality
- ✅ Be dismissible (X button)
- ✅ Match app design (dark theme, rounded corners)
- ✅ Show max 3x per day (prevents annoyance)
- ✅ Appear naturally in content flow

