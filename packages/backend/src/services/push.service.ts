import webpush from 'web-push';

// In production, these come from the college's VAPID keys stored in DB.
// For dev, we generate keys and store them in env.
const DEFAULT_VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const DEFAULT_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Send a push notification to a student's browser.
 * Fails silently — push is best-effort.
 */
export async function sendPushNotification(
  _applicationId: string,
  payload: PushPayload
): Promise<void> {
  try {
    // In production, look up PushSubscription model for this applicationId.
    // For now, we just log — push subscriptions require browser opt-in.
    console.log(`[PUSH] Would notify app:${_applicationId} → ${payload.title}`);

    // If VAPID keys are set, configure webpush
    if (DEFAULT_VAPID_PUBLIC && DEFAULT_VAPID_PRIVATE) {
      webpush.setVapidDetails(
        'mailto:support@campuspool.in',
        DEFAULT_VAPID_PUBLIC,
        DEFAULT_VAPID_PRIVATE
      );
    }
    // Real implementation would:
    // 1. Find PushSubscription docs for this applicationId
    // 2. Loop through and call webpush.sendNotification(sub, JSON.stringify(payload))
    // 3. Delete 410 (gone) subscriptions
  } catch (err) {
    console.error('[PUSH] Error:', err);
  }
}
