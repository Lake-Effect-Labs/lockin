// Service exports for easy importing
export * from './supabase';
export * from './scoring';
export * from './health';
export * from './playoffs';
export * from './notifications';
// Note: league.ts exports are intentionally omitted as they duplicate supabase.ts exports
export * from './simulation';
export * from './errorHandler';
export * from './dailySync';
export * from './realtimeSync';
// backgroundSync removed from barrel export to prevent eager loading of BackgroundFetch/TaskManager
// Import directly from './backgroundSync' if needed
export * from './matchupMonitor';
export * from './healthTest';

