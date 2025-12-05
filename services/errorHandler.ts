// ============================================
// ERROR HANDLER SERVICE
// Lock-In Fitness Competition App
// Centralized error handling and offline support
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// ============================================
// ERROR TYPES
// ============================================

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'PERMISSION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'LEAGUE_FULL'
  | 'ALREADY_MEMBER'
  | 'HEALTH_UNAVAILABLE'
  | 'UNKNOWN';

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

// ============================================
// ERROR MAPPING
// ============================================

const errorMessages: Record<ErrorType, { message: string; recoverable: boolean; retryable: boolean }> = {
  NETWORK_ERROR: {
    message: 'Unable to connect. Please check your internet connection.',
    recoverable: true,
    retryable: true,
  },
  AUTH_ERROR: {
    message: 'Authentication failed. Please sign in again.',
    recoverable: true,
    retryable: false,
  },
  PERMISSION_ERROR: {
    message: 'Permission denied. Please grant the required permissions.',
    recoverable: true,
    retryable: false,
  },
  VALIDATION_ERROR: {
    message: 'Invalid data provided. Please check your input.',
    recoverable: true,
    retryable: false,
  },
  NOT_FOUND: {
    message: 'The requested resource was not found.',
    recoverable: false,
    retryable: false,
  },
  LEAGUE_FULL: {
    message: 'This league is full.',
    recoverable: false,
    retryable: false,
  },
  ALREADY_MEMBER: {
    message: 'You are already a member of this league.',
    recoverable: false,
    retryable: false,
  },
  HEALTH_UNAVAILABLE: {
    message: 'Health data is not available. Using simulated data instead.',
    recoverable: true,
    retryable: false,
  },
  UNKNOWN: {
    message: 'An unexpected error occurred. Please try again.',
    recoverable: true,
    retryable: true,
  },
};

/**
 * Parse error and return standardized AppError
 */
export function parseError(error: any): AppError {
  // Network errors
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return createError('NETWORK_ERROR', error.message);
  }
  
  // Supabase errors
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return createError('NOT_FOUND', error.message);
      case '23505': // Unique violation
        if (error.message?.includes('league_members')) {
          return createError('ALREADY_MEMBER', error.message);
        }
        return createError('VALIDATION_ERROR', error.message);
      case '42501': // Permission denied
        return createError('PERMISSION_ERROR', error.message);
      default:
        break;
    }
  }
  
  // Auth errors
  if (error?.status === 401 || error?.message?.includes('auth')) {
    return createError('AUTH_ERROR', error.message);
  }
  
  return createError('UNKNOWN', error?.message || 'Unknown error');
}

function createError(type: ErrorType, originalMessage: string): AppError {
  const config = errorMessages[type];
  return {
    type,
    message: originalMessage,
    userMessage: config.message,
    recoverable: config.recoverable,
    retryable: config.retryable,
  };
}

// ============================================
// NETWORK STATUS
// ============================================

let isOnline = true;
let networkListeners: ((online: boolean) => void)[] = [];

/**
 * Initialize network monitoring
 */
export async function initNetworkMonitoring(): Promise<void> {
  try {
    const state = await NetInfo.fetch();
    isOnline = state.isConnected ?? true;
    
    NetInfo.addEventListener((state) => {
      const wasOnline = isOnline;
      isOnline = state.isConnected ?? true;
      
      if (wasOnline !== isOnline) {
        networkListeners.forEach(listener => listener(isOnline));
      }
    });
  } catch {
    // NetInfo not available (web), assume online
    isOnline = true;
  }
}

/**
 * Check if device is online
 */
export function getIsOnline(): boolean {
  return isOnline;
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkStatus(listener: (online: boolean) => void): () => void {
  networkListeners.push(listener);
  return () => {
    networkListeners = networkListeners.filter(l => l !== listener);
  };
}

// ============================================
// OFFLINE CACHE
// ============================================

const CACHE_PREFIX = 'lockin_cache_';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache data for offline use
 */
export async function cacheData<T>(key: string, data: T): Promise<void> {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cached));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Get cached data
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    
    const cached: CachedData<T> = JSON.parse(raw);
    
    // Check expiry
    if (Date.now() - cached.timestamp > CACHE_EXPIRY) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    
    return cached.data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

// ============================================
// RETRY LOGIC
// ============================================

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier } = { ...defaultRetryConfig, ...config };
  
  let lastError: any;
  let currentDelay = delayMs;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const appError = parseError(error);
      
      // Don't retry non-retryable errors
      if (!appError.retryable || attempt === maxAttempts) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }
  
  throw lastError;
}

// ============================================
// LEAGUE VALIDATION
// ============================================

export const LEAGUE_LIMITS = {
  MAX_PLAYERS: 20,
  MIN_PLAYERS_FOR_PLAYOFFS: 4,
  MAX_LEAGUES_PER_USER: 10,
  MAX_NAME_LENGTH: 30,
  CODE_LENGTH: 6,
};

/**
 * Validate if user can join league
 */
export function validateJoinLeague(
  currentMemberCount: number,
  isAlreadyMember: boolean
): { valid: boolean; error?: AppError } {
  if (isAlreadyMember) {
    return { valid: false, error: createError('ALREADY_MEMBER', 'Already a member') };
  }
  
  if (currentMemberCount >= LEAGUE_LIMITS.MAX_PLAYERS) {
    return { valid: false, error: createError('LEAGUE_FULL', 'League is full') };
  }
  
  return { valid: true };
}

/**
 * Validate league creation
 */
export function validateCreateLeague(
  name: string,
  userLeagueCount: number
): { valid: boolean; error?: AppError } {
  if (!name || name.trim().length === 0) {
    return { 
      valid: false, 
      error: createError('VALIDATION_ERROR', 'League name is required') 
    };
  }
  
  if (name.length > LEAGUE_LIMITS.MAX_NAME_LENGTH) {
    return { 
      valid: false, 
      error: createError('VALIDATION_ERROR', `League name must be ${LEAGUE_LIMITS.MAX_NAME_LENGTH} characters or less`) 
    };
  }
  
  if (userLeagueCount >= LEAGUE_LIMITS.MAX_LEAGUES_PER_USER) {
    return { 
      valid: false, 
      error: createError('VALIDATION_ERROR', `You can only be in ${LEAGUE_LIMITS.MAX_LEAGUES_PER_USER} leagues`) 
    };
  }
  
  return { valid: true };
}

