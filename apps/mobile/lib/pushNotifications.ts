/**
 * Sprint 6 — Push notification helpers
 * Handles Expo push token registration + server-side notify calls.
 */
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://dzialkometr.netlify.app'

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Request permissions and register the device's push token with our server.
 * Safe to call multiple times (upsert on server).
 */
export async function registerPushToken(workspaceId: string): Promise<string | null> {
  // Physical device only — simulators can't receive pushes
  if (!Device.isDevice) return null

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'DecisionEngine',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  // Get Expo push token
  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
  })

  if (!expoPushToken) return null

  // Save to server
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return expoPushToken

    await fetch(`${WEB_URL}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        expo_push_token: expoPushToken,
        workspace_id: workspaceId,
        device_name: Device.deviceName ?? undefined,
      }),
    })
  } catch {
    // Non-critical — token registration failure shouldn't break the app
  }

  return expoPushToken
}

/**
 * Send a push notification to all other workspace members.
 * Fire-and-forget — errors are swallowed.
 */
export async function notifyWorkspace(
  workspaceId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await fetch(`${WEB_URL}/api/push/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ workspace_id: workspaceId, title, body, data, exclude_self: true }),
    })
  } catch {
    // Fire-and-forget
  }
}
