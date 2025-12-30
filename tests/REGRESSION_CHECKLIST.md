# Lock-In Regression Test Checklist

This document lists all test cases for the Lock-In fitness competition app.
Use this for manual verification or as a reference for automated testing.

## Business Logic Summary

### League Rules
- **Valid sizes:** 4, 6, 8, 10, 12, 14 (even numbers only)
- **Auto-start:** League starts on next Monday when full
- **Season length:** 6, 8, 10, or 12 weeks (configurable)
- **Week boundaries:** Monday 00:00 - Saturday 23:59 (PENDING: Currently Mon-Sun)
- **Results day:** Sunday (view scores, see next opponent)

### Scoring System
| Metric | Points |
|--------|--------|
| Steps | 1 per 1,000 steps |
| Sleep | 2 per hour |
| Calories | 5 per 100 active calories |
| Workouts | 0.2 per minute |
| Stand Hours | 5 per hour |
| Distance | 3 per mile |

### Matchup Rules
- Round-robin schedule (everyone plays everyone)
- Higher score wins the matchup
- Ties: no winner recorded (both get tie count)

### Standings
- Primary sort: Wins (descending)
- Tiebreaker: Total points (descending)

### Playoffs
- Top 4 qualify (all league sizes)
- Seeding: 1v4, 2v3 in semifinals
- One week per round
- Finals winner = Champion
- League becomes inactive after finals

### Restrictions
- Cannot leave league mid-season
- Cannot delete league mid-season
- Cannot join league after it starts
- Cannot join league that is full

---

## Test Categories

### 1. League Creation (LC)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| LC-001-4 | League size 4 is valid | Critical | |
| LC-001-6 | League size 6 is valid | Critical | |
| LC-001-8 | League size 8 is valid | Critical | |
| LC-001-10 | League size 10 is valid | Critical | |
| LC-001-12 | League size 12 is valid | Critical | |
| LC-001-14 | League size 14 is valid | Critical | |
| LC-002-* | Invalid sizes (1,2,3,5,7,9,11,13,15,16,20) rejected | High | |
| LC-003 | Join code is 6 alphanumeric characters | High | |
| LC-004-* | Season lengths (6,8,10,12 weeks) are valid | Medium | |
| LC-005 | New league has null start_date | Medium | |

### 2. League Joining (LJ)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| LJ-001-* | League auto-starts when full (all sizes) | Critical | |
| LJ-002 | Cannot join full league | Critical | |
| LJ-003 | Cannot join started league | Critical | |
| LJ-004 | Start date is next Monday | High | |

### 3. Matchup Generation (MG)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| MG-001-* | Round-robin complete for all league sizes | Critical | |
| MG-002-* | No byes with even player counts | High | |
| MG-003 | Each player plays exactly once per week | Critical | |
| MG-004 | No repeat opponents before full round-robin | High | |

### 4. Weekly Scoring (WS)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| WS-001 | Basic scoring calculation | Critical | |
| WS-002 | Zero values return zero points | High | |
| WS-003 | NaN values treated as zero | Critical | |
| WS-004 | Negative values clamped to zero | High | |
| WS-005 | Metrics capped at maximums | High | |
| WS-006 | Custom scoring config works | Medium | |
| WS-007 | Stand hours scored correctly | High | |
| WS-008 | Workout minutes scored at 0.2/min | High | |

### 5. Week Finalization (WF)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| WF-001 | Higher score wins | Critical | |
| WF-002 | Lower score loses | Critical | |
| WF-003 | Equal scores result in tie | High | |
| WF-004 | Standings sorted by wins first | Critical | |
| WF-005 | Tiebreaker uses total points | Critical | |
| WF-006 | Current week advances after finalization | High | |

### 6. Playoff Qualification (PQ)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| PQ-001 | Top 4 qualify for playoffs | Critical | |
| PQ-002 | Playoff tiebreaker by points | Critical | |
| PQ-003 | Playoffs start after season ends | Critical | |
| PQ-004 | Playoffs don't restart if already started | High | |
| PQ-005 | Need minimum 4 players for playoffs | Critical | |
| PQ-006-* | Top 4 qualify regardless of league size | High | |

### 7. Playoff Bracket (PB)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| PB-001 | Semifinal seeding: 1v4, 2v3 | Critical | |
| PB-002 | One week per playoff round | High | |
| PB-003 | Semifinal winners go to finals | Critical | |
| PB-004 | Playoff loser is eliminated | High | |

### 8. Champion (CH)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| CH-001 | Finals winner becomes champion | Critical | |
| CH-002 | League marked inactive after finals | High | |
| CH-003 | Close finals decided by margin | Medium | |

### 9. Edge Cases (EC)

| ID | Test | Priority | Status |
|----|------|----------|--------|
| EC-001 | Cannot leave league mid-season | Critical | |
| EC-002 | Cannot delete league mid-season | Critical | |
| EC-003 | Can delete completed league | Medium | |
| EC-004 | No health data = 0 points | High | |
| EC-005 | Infinity values treated as zero | High | |
| EC-006 | Small decimal precision maintained | Low | |
| EC-007 | All same record: sort by points | High | |

---

## Running Tests

### Automated Tests
```bash
# Run all regression tests
npx ts-node tests/run-regression.ts

# Run with JSON output (for parsing)
npx ts-node tests/run-regression.ts --output json

# Run with Markdown output (for documentation)
npx ts-node tests/run-regression.ts --output markdown

# Filter by category
npx ts-node tests/run-regression.ts --category "Playoff"
```

### Manual Testing via Speed Run
1. Go to Settings in the app
2. Enable "Speed Run" mode
3. This simulates a complete league lifecycle rapidly
4. Verify each phase completes correctly

---

## Known Issues

See `GITHUB_ISSUES.md` for tracked issues.

### ISSUE-001: Week Boundaries
- **Current:** Monday 00:00 - Sunday 23:59
- **Desired:** Monday 00:00 - Saturday 23:59, Sunday = Results Day

---

## Test Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| League Creation | 100% | TBD |
| League Joining | 100% | TBD |
| Matchup Generation | 100% | TBD |
| Weekly Scoring | 100% | TBD |
| Week Finalization | 100% | TBD |
| Playoff Qualification | 100% | TBD |
| Playoff Bracket | 100% | TBD |
| Champion | 100% | TBD |
| Edge Cases | 90% | TBD |
