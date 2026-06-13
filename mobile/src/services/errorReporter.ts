import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Production-safe error reporting.
 *
 * Privacy-first by design (the app is local-first and ships no analytics SDKs):
 * reports carry ONLY a message, stack, app version, platform and timestamp —
 * never CRS inputs or any user data. With no endpoint configured the reporter
 * is local-only (an in-memory ring buffer the UI can surface), so the default
 * build transmits nothing. Set `EXPO_PUBLIC_ERROR_REPORT_URL` to forward
 * reports to a self-hosted collector.
 *
 * The reporter never throws — failures here must not mask the original error.
 */

export interface ErrorReport {
  message: string;
  source: string;
  appVersion: string;
  platform: string;
  timestamp: string;
  stack?: string;
  componentStack?: string;
}

export interface ReportContext {
  source: string;
  componentStack?: string;
}

const ENDPOINT = process.env.EXPO_PUBLIC_ERROR_REPORT_URL?.trim() || null;
const MAX_BUFFER = 20;
const recent: ErrorReport[] = [];

function appVersion(): string {
  return Constants.expoConfig?.version ?? 'unknown';
}

function buildReport(error: unknown, context: ReportContext): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message: err.message || 'Unknown error',
    source: context.source,
    appVersion: appVersion(),
    platform: Platform.OS,
    timestamp: new Date().toISOString(),
    ...(err.stack ? { stack: err.stack } : {}),
    ...(context.componentStack ? { componentStack: context.componentStack } : {}),
  };
}

/** Most recent reports (newest last), bounded — for an in-app diagnostics view. */
export function getRecentErrors(): ErrorReport[] {
  return [...recent];
}

/** Clears the in-memory buffer (used by tests and a manual "clear logs" action). */
export function clearRecentErrors(): void {
  recent.length = 0;
}

export async function reportError(error: unknown, context: ReportContext): Promise<void> {
  const report = buildReport(error, context);

  recent.push(report);
  if (recent.length > MAX_BUFFER) recent.shift();

  if (__DEV__) {
    console.error(`[${report.source}]`, report.message, report.stack ?? '');
  }

  if (!ENDPOINT) return; // local-only by default

  await transmit(report, ENDPOINT);
}

/**
 * POSTs a report to a collector. Never throws — a failed report must not mask
 * the original error. Exported so the transport is unit-testable independently
 * of the build-time-inlined `EXPO_PUBLIC_ERROR_REPORT_URL`.
 */
export async function transmit(report: ErrorReport, endpoint: string): Promise<void> {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
  } catch {
    // Swallow: the reporter must never throw or mask the original failure.
  }
}

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
interface ErrorUtilsLike {
  getGlobalHandler?: () => GlobalErrorHandler | undefined;
  setGlobalHandler?: (handler: GlobalErrorHandler) => void;
}

let installed = false;

/**
 * Routes uncaught JS errors through the reporter while preserving React
 * Native's existing handler (which shows the red box in dev / crashes in prod).
 * Idempotent.
 */
export function installGlobalErrorHandler(): void {
  if (installed) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  installed = true;

  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    void reportError(error, { source: isFatal ? 'uncaught-fatal' : 'uncaught' });
    previous?.(error, isFatal);
  });
}
