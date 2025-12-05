import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/utils/colors';
import { Avatar } from './Avatar';
import { PlayoffBracket, PlayoffMatchDisplay } from '@/services/playoffs';
import { User } from '@/services/supabase';

// ============================================
// BRACKET VIEW COMPONENT
// Playoff bracket visualization
// ============================================

interface BracketViewProps {
  bracket: PlayoffBracket;
  currentUserId: string;
  style?: ViewStyle;
}

export function BracketView({
  bracket,
  currentUserId,
  style,
}: BracketViewProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Semifinals */}
      <View style={styles.round}>
        <Text style={styles.roundTitle}>SEMIFINALS</Text>
        <View style={styles.matchesColumn}>
          <BracketMatch 
            match={bracket.semifinals.match1}
            currentUserId={currentUserId}
          />
          <BracketMatch 
            match={bracket.semifinals.match2}
            currentUserId={currentUserId}
          />
        </View>
      </View>
      
      {/* Connector lines */}
      <View style={styles.connectors}>
        <View style={styles.connectorTop} />
        <View style={styles.connectorBottom} />
        <View style={styles.connectorCenter} />
      </View>
      
      {/* Finals */}
      <View style={styles.round}>
        <Text style={styles.roundTitle}>FINALS</Text>
        {bracket.finals ? (
          <BracketMatch 
            match={bracket.finals}
            currentUserId={currentUserId}
            isFinals
          />
        ) : (
          <View style={styles.tbdMatch}>
            <Text style={styles.tbdText}>TBD</Text>
          </View>
        )}
      </View>
      
      {/* Champion */}
      {bracket.champion && (
        <View style={styles.championSection}>
          <ChampionCard champion={bracket.champion} />
        </View>
      )}
    </View>
  );
}

// Individual bracket match
interface BracketMatchProps {
  match: PlayoffMatchDisplay;
  currentUserId: string;
  isFinals?: boolean;
}

function BracketMatch({
  match,
  currentUserId,
  isFinals = false,
}: BracketMatchProps) {
  const isUserInMatch = match.player1.user.id === currentUserId || 
                        match.player2.user.id === currentUserId;
  
  return (
    <View style={[
      styles.match,
      isFinals && styles.finalsMatch,
      isUserInMatch && styles.userMatch,
    ]}>
      <BracketPlayer 
        player={match.player1}
        isWinner={match.player1.isWinner}
        isCurrentUser={match.player1.user.id === currentUserId}
      />
      <View style={styles.matchDivider} />
      <BracketPlayer 
        player={match.player2}
        isWinner={match.player2.isWinner}
        isCurrentUser={match.player2.user.id === currentUserId}
      />
    </View>
  );
}

// Player row in bracket
interface BracketPlayerProps {
  player: PlayoffMatchDisplay['player1'];
  isWinner: boolean;
  isCurrentUser: boolean;
}

function BracketPlayer({
  player,
  isWinner,
  isCurrentUser,
}: BracketPlayerProps) {
  return (
    <View style={[
      styles.player,
      isWinner && styles.winnerPlayer,
      isCurrentUser && styles.currentUserPlayer,
    ]}>
      <View style={styles.playerLeft}>
        <View style={styles.seedBadge}>
          <Text style={styles.seedText}>{player.seed}</Text>
        </View>
        <Avatar
          uri={player.user.avatar_url}
          name={player.user.username}
          size="small"
          showBorder={isWinner}
          borderColor={colors.sport.gold}
        />
        <Text style={[
          styles.playerName,
          isWinner && styles.winnerName,
        ]} numberOfLines={1}>
          {player.user.username || 'TBD'}
        </Text>
      </View>
      <Text style={[
        styles.playerScore,
        isWinner && styles.winnerScore,
      ]}>
        {player.score.toFixed(0)}
      </Text>
    </View>
  );
}

// Champion celebration card
interface ChampionCardProps {
  champion: User;
}

function ChampionCard({ champion }: ChampionCardProps) {
  return (
    <LinearGradient
      colors={colors.gradients.victory}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.championCard}
    >
      <Text style={styles.championEmoji}>👑</Text>
      <Text style={styles.championTitle}>CHAMPION</Text>
      <Avatar
        uri={champion.avatar_url}
        name={champion.username}
        size="xlarge"
        showBorder
        borderColor={colors.sport.gold}
      />
      <Text style={styles.championName}>{champion.username}</Text>
      <Text style={styles.championSubtitle}>Season Champion</Text>
    </LinearGradient>
  );
}

// Compact bracket for smaller displays
interface CompactBracketProps {
  bracket: PlayoffBracket;
  style?: ViewStyle;
}

export function CompactBracket({ bracket, style }: CompactBracketProps) {
  const getMatchResult = (match: PlayoffMatchDisplay) => {
    if (!match.isFinalized) return '⏳';
    return `${match.player1.score.toFixed(0)}-${match.player2.score.toFixed(0)}`;
  };
  
  return (
    <View style={[styles.compactContainer, style]}>
      <View style={styles.compactRound}>
        <Text style={styles.compactRoundLabel}>Semi 1</Text>
        <Text style={styles.compactMatchup}>
          {bracket.semifinals.match1.player1.user.username?.slice(0, 8)} vs{' '}
          {bracket.semifinals.match1.player2.user.username?.slice(0, 8)}
        </Text>
        <Text style={styles.compactResult}>
          {getMatchResult(bracket.semifinals.match1)}
        </Text>
      </View>
      
      <View style={styles.compactRound}>
        <Text style={styles.compactRoundLabel}>Semi 2</Text>
        <Text style={styles.compactMatchup}>
          {bracket.semifinals.match2.player1.user.username?.slice(0, 8)} vs{' '}
          {bracket.semifinals.match2.player2.user.username?.slice(0, 8)}
        </Text>
        <Text style={styles.compactResult}>
          {getMatchResult(bracket.semifinals.match2)}
        </Text>
      </View>
      
      {bracket.finals && (
        <View style={styles.compactRound}>
          <Text style={styles.compactRoundLabel}>Finals</Text>
          <Text style={styles.compactMatchup}>
            {bracket.finals.player1.user.username?.slice(0, 8)} vs{' '}
            {bracket.finals.player2.user.username?.slice(0, 8)}
          </Text>
          <Text style={styles.compactResult}>
            {getMatchResult(bracket.finals)}
          </Text>
        </View>
      )}
      
      {bracket.champion && (
        <View style={styles.compactChampion}>
          <Text style={styles.compactChampionEmoji}>🏆</Text>
          <Text style={styles.compactChampionName}>
            {bracket.champion.username}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  round: {
    flex: 1,
  },
  roundTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  matchesColumn: {
    gap: 24,
  },
  match: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  finalsMatch: {
    borderColor: colors.sport.gold,
    borderWidth: 2,
  },
  userMatch: {
    borderColor: colors.primary[500],
  },
  matchDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  winnerPlayer: {
    backgroundColor: colors.sport.gold + '10',
  },
  currentUserPlayer: {
    backgroundColor: colors.primary[500] + '10',
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  seedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  seedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  playerName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: 8,
    maxWidth: 70,
  },
  winnerName: {
    fontWeight: '700',
  },
  playerScore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  winnerScore: {
    color: colors.sport.gold,
    fontWeight: '700',
  },
  connectors: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 200,
  },
  connectorTop: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 12,
    height: 60,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border.default,
    borderTopRightRadius: 8,
  },
  connectorBottom: {
    position: 'absolute',
    bottom: 40,
    right: 0,
    width: 12,
    height: 60,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.border.default,
    borderBottomRightRadius: 8,
  },
  connectorCenter: {
    position: 'absolute',
    right: 0,
    width: 12,
    height: 2,
    backgroundColor: colors.border.default,
  },
  tbdMatch: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 24,
    alignItems: 'center',
  },
  tbdText: {
    fontSize: 14,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  championSection: {
    marginLeft: 24,
  },
  championCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    minWidth: 140,
  },
  championEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  championTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  championName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 12,
  },
  championSubtitle: {
    fontSize: 12,
    color: colors.text.primary,
    opacity: 0.8,
    marginTop: 4,
  },
  compactContainer: {
    backgroundColor: colors.background.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  compactRound: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  compactRoundLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    width: 50,
  },
  compactMatchup: {
    fontSize: 12,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  compactResult: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    width: 50,
    textAlign: 'right',
  },
  compactChampion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    gap: 8,
  },
  compactChampionEmoji: {
    fontSize: 20,
  },
  compactChampionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sport.gold,
  },
});

