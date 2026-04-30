// Lightweight analytics — tracks events locally in dev,
// ready to forward to any analytics provider in production.
//
// To add a real provider later (e.g. Mixpanel, Amplitude, PostHog):
// 1. Install their SDK
// 2. Replace the TODO comment in `track()` with the provider's track() call
// No call sites need to change.

import { logger } from './logger';

export type AnalyticsEvent =
  | 'app_opened'
  | 'onboarding_completed'
  | 'session_started'
  | 'session_step_responded'
  | 'session_step_skipped'
  | 'session_step_timeout'
  | 'session_completed'
  | 'session_synced'
  | 'session_sync_failed'
  | 'history_viewed';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

export const analytics = {
  track: (event: AnalyticsEvent, properties?: EventProperties) => {
    logger.info('Analytics', event, properties);

    // TODO: forward to provider in production, e.g.:
    // if (process.env.NODE_ENV === 'production') {
    //   Mixpanel.track(event, properties);
    // }
  },
};