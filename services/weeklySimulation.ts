// ============================================
// WEEK-BY-WEEK SIMULATION
// Lock-In Fitness Competition App
// Interactive step-by-step league simulation
// ============================================

import { SimulatedPlayer, SeasonSimulation } from './simulation';
import { calculatePoints, FitnessMetrics } from './scoring';

export interface WeekResult {
  week: number;
  matchups: Array<{
    player1: SimulatedPlayer;
    player2: SimulatedPlayer;
    player1Score: number;
    player2Score: number;
    winner: SimulatedPlayer | null;
    isTie: boolean;
  }>;
  standings: SimulatedPlayer[];
  message: string;
}

export interface PlayoffResult {
  round: 'semifinals' | 'finals';
  matchups: Array<{
    player1: SimulatedPlayer;
    player2: SimulatedPlayer;
    player1Score: number;
    player2Score: number;
    winner: SimulatedPlayer | null;
  }>;
  standings: SimulatedPlayer[];
  message: string;
}

export interface SimulationStep {
  type: 'week' | 'playoff_semifinals' | 'playoff_finals' | 'champion';
  week?: number;
  data: WeekResult | PlayoffResult | { champion: SimulatedPlayer; message: string };
}

/**
 * Generate random weekly score (seeded for reproducibility)
 */
function generateRandomWeeklyScore(seed: number): number {
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  return Math.round((50 + rand * 150) * 100) / 100;
}

/**
 * Generate fitness metrics for a player in a week
 */
function generateWeeklyMetrics(seed: number): FitnessMetrics {
  const x = Math.sin(seed) * 10000;
  const rand = x - Math.floor(x);
  
  return {
    steps: Math.floor(5000 + rand * 20000),
    sleepHours: Math.round((6 + rand * 3) * 10) / 10,
    calories: Math.floor(200 + rand * 800),
    workouts: Math.floor(rand * 4),
    distance: Math.round((2 + rand * 8) * 10) / 10,
  };
}

/**
 * Run week-by-week simulation with step-by-step results
 */
export function runWeeklySimulation(
  playerCount: number = 8,
  weekCount: number = 8,
  seed: number = 12345
): SimulationStep[] {
  const steps: SimulationStep[] = [];
  
  // Create players
  const players: SimulatedPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i + 1}`,
    name: ['Sam', 'Mike', 'Kevin', 'Jake', 'Alex', 'Jordan', 'Casey', 'Riley'][i] || `Player${i + 1}`,
    weeklyScores: [],
    wins: 0,
    losses: 0,
    ties: 0,
    totalPoints: 0,
  }));
  
  // Simulate regular season week by week
  for (let week = 1; week <= weekCount; week++) {
    // Generate scores for this week
    players.forEach((player, playerIdx) => {
      const metrics = generateWeeklyMetrics(seed + playerIdx * 1000 + week * 10);
      const score = calculatePoints(metrics);
      player.weeklyScores.push(score);
      player.totalPoints += score;
    });
    
    // Create matchups for this week (round-robin rotation)
    const rotated = [...players];
    for (let i = 0; i < week - 1; i++) {
      const last = rotated.pop()!;
      rotated.splice(1, 0, last);
    }
    
    const weekMatchups: WeekResult['matchups'] = [];
    
    for (let i = 0; i < Math.floor(playerCount / 2); i++) {
      const p1 = rotated[i];
      const p2 = rotated[playerCount - 1 - i];
      
      const p1Score = p1.weeklyScores[week - 1];
      const p2Score = p2.weeklyScores[week - 1];
      
      let winner: SimulatedPlayer | null = null;
      let isTie = false;
      
      if (p1Score > p2Score) {
        winner = p1;
        p1.wins++;
        p2.losses++;
      } else if (p2Score > p1Score) {
        winner = p2;
        p2.wins++;
        p1.losses++;
      } else {
        isTie = true;
        p1.ties++;
        p2.ties++;
      }
      
      weekMatchups.push({
        player1: p1,
        player2: p2,
        player1Score: p1Score,
        player2Score: p2Score,
        winner,
        isTie,
      });
    }
    
    // Sort standings
    const standings = [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalPoints - a.totalPoints;
    });
    
    // Create week result
    const weekResult: WeekResult = {
      week,
      matchups: weekMatchups,
      standings,
      message: `Week ${week} Complete! ${weekMatchups.filter(m => m.winner).length} matchups decided.`,
    };
    
    steps.push({
      type: 'week',
      week,
      data: weekResult,
    });
  }
  
  // Playoffs (if we have at least 4 players)
  if (playerCount >= 4) {
    const finalStandings = [...players].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.totalPoints - a.totalPoints;
    });
    
    const playoffSeeds = finalStandings.slice(0, 4);
    
    // Semifinals
    const semifinals: PlayoffResult['matchups'] = [];
    
    // Semi 1: Seed 1 vs Seed 4
    const semi1P1 = playoffSeeds[0];
    const semi1P2 = playoffSeeds[3];
    const semi1P1Score = generateRandomWeeklyScore(seed + 10000);
    const semi1P2Score = generateRandomWeeklyScore(seed + 10001);
    const semi1Winner = semi1P1Score > semi1P2Score ? semi1P1 : semi1P2;
    
    semifinals.push({
      player1: semi1P1,
      player2: semi1P2,
      player1Score: semi1P1Score,
      player2Score: semi1P2Score,
      winner: semi1Winner,
    });
    
    // Semi 2: Seed 2 vs Seed 3
    const semi2P1 = playoffSeeds[1];
    const semi2P2 = playoffSeeds[2];
    const semi2P1Score = generateRandomWeeklyScore(seed + 10002);
    const semi2P2Score = generateRandomWeeklyScore(seed + 10003);
    const semi2Winner = semi2P1Score > semi2P2Score ? semi2P1 : semi2P2;
    
    semifinals.push({
      player1: semi2P1,
      player2: semi2P2,
      player1Score: semi2P1Score,
      player2Score: semi2P2Score,
      winner: semi2Winner,
    });
    
    const playoffStandings = [semi1Winner, semi2Winner, 
      semi1Winner === semi1P1 ? semi1P2 : semi1P1,
      semi2Winner === semi2P1 ? semi2P2 : semi2P1,
    ];
    
    steps.push({
      type: 'playoff_semifinals',
      data: {
        round: 'semifinals',
        matchups: semifinals,
        standings: playoffStandings,
        message: `Semifinals Complete! ${semi1Winner.name} and ${semi2Winner.name} advance to finals.`,
      } as PlayoffResult,
    });
    
    // Finals
    const finalsP1Score = generateRandomWeeklyScore(seed + 20000);
    const finalsP2Score = generateRandomWeeklyScore(seed + 20001);
    const champion = finalsP1Score > finalsP2Score ? semi1Winner : semi2Winner;
    
    steps.push({
      type: 'playoff_finals',
      data: {
        round: 'finals',
        matchups: [{
          player1: semi1Winner,
          player2: semi2Winner,
          player1Score: finalsP1Score,
          player2Score: finalsP2Score,
          winner: champion,
        }],
        standings: [champion, finalsP1Score > finalsP2Score ? semi2Winner : semi1Winner],
        message: `Finals Complete! ${champion.name} is the champion!`,
      } as PlayoffResult,
    });
    
    // Champion announcement
    steps.push({
      type: 'champion',
      data: {
        champion,
        message: `🏆 ${champion.name} wins the league with a ${champion.wins}-${champion.losses}-${champion.ties} record and ${champion.totalPoints.toFixed(1)} total points!`,
      },
    });
  }
  
  return steps;
}

