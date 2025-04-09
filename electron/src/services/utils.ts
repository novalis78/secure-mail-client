import { exec, ExecOptions } from 'child_process';
import { promisify } from 'util';

// Promisified exec function
export const execAsync = promisify(exec);

// Get current timestamp
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    return defaultValue;
  }
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}