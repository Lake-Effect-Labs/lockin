# Data Retention Strategy for Lock-In

## Current Situation

When a league finishes:
- `is_active` is set to `false`
- `champion_id` is set
- All matchups, scores, and playoff data remain in the database

## Recommendation: **Archive, Don't Purge**

### Why Keep Historical Data?

1. **User Value**: Users want to see their past seasons and achievements
2. **Engagement**: Historical data encourages users to join new leagues
3. **Low Storage Cost**: Database storage is cheap (Supabase free tier: 500MB)
4. **Analytics**: Historical data helps you understand user behavior

### Recommended Approach: **Soft Archive**

Instead of deleting, mark leagues as archived and keep them accessible:

```sql
-- Add archived_at timestamp to leagues table
ALTER TABLE leagues ADD COLUMN archived_at TIMESTAMPTZ;

-- When league finishes, set archived_at
UPDATE leagues 
SET archived_at = NOW() 
WHERE id = league_id AND champion_id IS NOT NULL;
```

### Data Retention Options

#### Option 1: Keep Everything (Recommended for Now)
- **Keep**: All league data indefinitely
- **Why**: Storage is cheap, users value history
- **When to change**: Only if you hit storage limits (unlikely for a long time)

#### Option 2: Archive After 90 Days
- **Keep**: Full data for 90 days after season ends
- **Then**: Archive (keep summary stats, remove detailed weekly scores)
- **Why**: Balance between storage and user value

#### Option 3: Summary Stats Only (After 1 Year)
- **Keep**: League name, champion, final standings, playoff bracket
- **Remove**: Individual weekly scores, detailed matchup data
- **Why**: Maximum storage efficiency while preserving key memories

### Implementation Strategy

#### Phase 1: Current (No Changes Needed)
- Keep all data as-is
- Leagues marked `is_active = false` when finished
- Users can view past leagues

#### Phase 2: Add Archive View (Optional)
```typescript
// Filter to show only active leagues by default
const activeLeagues = leagues.filter(l => l.is_active);
const archivedLeagues = leagues.filter(l => !l.is_active);
```

#### Phase 3: Cleanup Job (Only if Needed)
If storage becomes an issue, create a cleanup function:

```sql
-- Cleanup old league data (run monthly)
CREATE OR REPLACE FUNCTION cleanup_old_leagues()
RETURNS VOID AS $$
BEGIN
    -- Archive leagues older than 1 year
    UPDATE leagues 
    SET archived_at = NOW()
    WHERE archived_at IS NULL 
    AND champion_id IS NOT NULL
    AND created_at < NOW() - INTERVAL '1 year';
    
    -- Optional: Delete detailed weekly scores for archived leagues older than 2 years
    DELETE FROM weekly_scores
    WHERE league_id IN (
        SELECT id FROM leagues 
        WHERE archived_at < NOW() - INTERVAL '2 years'
    );
END;
$$ LANGUAGE plpgsql;
```

### Storage Estimates

**Per League** (rough estimates):
- League metadata: ~1 KB
- League members: ~500 bytes per member (20 max = 10 KB)
- Matchups: ~200 bytes per matchup (80 matchups for 8-week season = 16 KB)
- Weekly scores: ~300 bytes per score (160 scores for 8 players × 8 weeks = 48 KB)
- Playoffs: ~2 KB
- **Total per league**: ~77 KB

**For 1,000 finished leagues**: ~77 MB
**For 10,000 finished leagues**: ~770 MB

### Recommendation

**Start with Option 1 (Keep Everything)**:
- ✅ No code changes needed
- ✅ Users can view past seasons
- ✅ Storage costs are minimal
- ✅ You can always archive later if needed

**Monitor storage usage**:
- Check Supabase dashboard monthly
- If you approach 400MB (80% of free tier), consider Option 2
- Only implement cleanup if absolutely necessary

### Best Practices

1. **Don't delete user data** unless legally required
2. **Archive instead of delete** - preserves user experience
3. **Keep summary stats** even if removing detailed data
4. **Notify users** before major data cleanup (if you ever do it)
5. **Consider export feature** - let users download their league history

### Future Enhancements

Consider adding:
- "Past Seasons" view in the app
- League history export (CSV/PDF)
- "Hall of Fame" showing all-time champions
- Statistics across all leagues (total wins, best season, etc.)

## Conclusion

**Don't purge data after a week.** Keep historical leagues accessible to users. The storage cost is minimal, and the user value is high. Only consider cleanup if you're approaching storage limits, which is unlikely for a long time.

