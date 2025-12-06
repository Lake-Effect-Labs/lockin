# Scalability Analysis: Concurrent User Capacity

## Current Architecture Overview

Your platform uses:
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Frontend**: React Native/Expo (client-side)
- **Sync Pattern**: Hybrid polling + real-time subscriptions

## Per-User Resource Consumption

### Database Operations Per User
- **Foreground sync**: Every 5 minutes
  - 1 read: `getUserLeagues()`
  - N reads: `getLeague()` for each league
  - N writes: `upsertWeeklyScore()` for each active league
  - 1 read: HealthKit data (local, no DB impact)

- **Matchup view sync**: Every 30 seconds (when viewing matchup)
  - Additional reads: `getUserMatchup()`, `getWeeklyScore()`
  - Same writes as foreground sync

- **Real-time subscription**: 1 WebSocket connection per user
  - Listens to `weekly_scores` table changes
  - Minimal bandwidth (only receives updates)

- **Background sync**: Every 15 minutes (iOS throttled)
  - Same operations as foreground sync

### Daily Operations Per User
Assuming average user:
- **3 active leagues** per user
- **App open 2 hours/day** (foreground)
- **Matchup view 10 minutes/day** (aggressive polling)

**Daily operations:**
- Foreground syncs: ~24 syncs/day (2 hours × 12 syncs/hour)
- Matchup syncs: ~20 syncs/day (10 min × 2 syncs/min)
- Background syncs: ~96 syncs/day (15 min intervals)

**Total per user: ~140 sync operations/day**
- ~420 database reads/day (3 leagues × 140 syncs)
- ~420 database writes/day (3 leagues × 140 syncs)
- 1 WebSocket connection (persistent)

## Supabase Limits (Free Tier)

### Current Limits
- **Monthly Active Users**: 50,000
- **Database Size**: 500MB
- **Bandwidth**: 2GB/month
- **API Requests**: Unlimited (but rate-limited)
- **Realtime Connections**: ~200 concurrent (free tier)
- **Database Connections**: ~60 concurrent (free tier)

### Paid Tier Limits (Pro - $25/month)
- **Monthly Active Users**: Unlimited
- **Database Size**: 8GB (scales)
- **Bandwidth**: Unlimited (pay per GB after 50GB)
- **Realtime Connections**: ~500 concurrent
- **Database Connections**: ~200 concurrent

## Concurrent User Capacity Analysis

### Bottleneck #1: Realtime Connections
**Free Tier**: ~200 concurrent WebSocket connections
- Each user maintains 1 persistent connection
- **Capacity**: ~200 concurrent users online simultaneously

**Pro Tier**: ~500 concurrent connections
- **Capacity**: ~500 concurrent users online simultaneously

### Bottleneck #2: Database Connections
**Free Tier**: ~60 concurrent database connections
- Each sync operation uses 1 connection (briefly)
- With 5-minute polling, connections are reused quickly
- **Capacity**: ~300-500 concurrent users (connections are short-lived)

**Pro Tier**: ~200 concurrent connections
- **Capacity**: ~1,000-2,000 concurrent users

### Bottleneck #3: Database Write Throughput
PostgreSQL can handle:
- **Free Tier**: ~100-200 writes/second
- **Pro Tier**: ~500-1,000 writes/second

With 420 writes/user/day = **0.005 writes/second per user**
- **Free Tier**: ~20,000-40,000 users (write-limited)
- **Pro Tier**: ~100,000-200,000 users (write-limited)

### Bottleneck #4: Bandwidth
**Free Tier**: 2GB/month
- Per user: ~140 syncs/day × 2KB/sync = 280KB/day = 8.4MB/month
- **Capacity**: ~240 users/month (bandwidth-limited)

**Pro Tier**: 50GB included, then $0.09/GB
- **Capacity**: ~6,000 users/month (included), unlimited beyond

## Real-World Capacity Estimates

### Free Tier Capacity
**Limiting Factor**: Realtime connections (200 concurrent)

**Concurrent Users**: ~150-200 users online simultaneously
- Conservative estimate accounting for connection overhead
- Assumes users stay online average 30 minutes

**Monthly Active Users**: ~2,000-5,000 users
- Limited by bandwidth (2GB/month)
- Can support more if users sync less frequently

### Pro Tier Capacity ($25/month)
**Limiting Factor**: Realtime connections (500 concurrent)

**Concurrent Users**: ~400-500 users online simultaneously
- Can handle peak usage during active matchup periods

**Monthly Active Users**: ~10,000-50,000 users
- Bandwidth scales (50GB included)
- Database can handle much more

### Enterprise Tier Capacity
**Concurrent Users**: 1,000+ users
- Scales horizontally with Supabase Enterprise
- Custom connection limits

## Optimization Opportunities

### 1. Reduce Polling Frequency
**Current**: 5 minutes foreground, 30 seconds matchup view
**Optimized**: 2 minutes foreground, 15 seconds matchup view
- **Impact**: 2.5x more database load
- **Trade-off**: Better UX vs. higher costs

### 2. Batch Operations
**Current**: Individual writes per league
**Optimized**: Batch all league writes in single transaction
- **Impact**: 3x reduction in database connections
- **Trade-off**: Slightly more complex code

### 3. Connection Pooling
**Current**: Supabase handles automatically
**Optimized**: Already optimized by Supabase
- **Impact**: Minimal (already done)

### 4. Caching Strategy
**Current**: Minimal caching
**Optimized**: Cache league data, only sync when needed
- **Impact**: 50-70% reduction in reads
- **Trade-off**: Stale data risk

### 5. Selective Realtime Subscriptions
**Current**: Subscribe to all `weekly_scores` changes
**Optimized**: Filter by `league_id` in subscription
- **Impact**: 50% reduction in unnecessary updates
- **Trade-off**: More complex subscription logic

## Recommendations

### For Launch (Free Tier)
**Target**: 100-150 concurrent users
- Monitor realtime connection usage
- Implement connection cleanup on app background
- Add connection retry logic
- **Cost**: $0/month

### For Growth (Pro Tier)
**Target**: 400-500 concurrent users
- Upgrade to Pro tier ($25/month)
- Implement optimizations #1, #2, #4
- Monitor database connection pool
- **Cost**: $25/month + bandwidth overages

### For Scale (Enterprise)
**Target**: 1,000+ concurrent users
- Contact Supabase for Enterprise plan
- Implement all optimizations
- Consider read replicas for heavy read operations
- **Cost**: Custom pricing

## Monitoring Metrics

Track these to know when to scale:
1. **Realtime Connection Count**: Should stay <80% of limit
2. **Database Connection Pool**: Should stay <80% of limit
3. **API Response Times**: Should stay <500ms p95
4. **Bandwidth Usage**: Monitor monthly consumption
5. **Database Size**: Monitor growth rate

## Conclusion

**Current Capacity (Free Tier)**:
- ✅ **150-200 concurrent users** online simultaneously
- ✅ **2,000-5,000 monthly active users** (bandwidth-limited)
- ⚠️ **Realtime connections** are the primary bottleneck

**With Pro Tier ($25/month)**:
- ✅ **400-500 concurrent users** online simultaneously
- ✅ **10,000-50,000 monthly active users**
- ✅ **Bandwidth** becomes the next bottleneck

**With Optimizations**:
- ✅ **2-3x capacity improvement** possible
- ✅ **Better user experience** (faster updates)
- ⚠️ **Higher database load** (more frequent polling)

Your architecture is well-designed for scalability. The main constraint is Supabase's free tier limits, which are easily addressed by upgrading to Pro tier when you hit ~150 concurrent users.

