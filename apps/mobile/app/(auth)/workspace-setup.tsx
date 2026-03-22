import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING } from '@de/ui'

export default function WorkspaceSetupScreen() {
  const { refreshWorkspace } = useAuth()

  useEffect(() => {
    ;(async () => {
      await supabase.rpc('create_workspace_for_user', {
        workspace_name: 'Działki Wojtek & Sabina',
      })
      await refreshWorkspace()
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.inner}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.text}>Przygotowuję aplikację…</Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E2B3C' },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.base,
  },
  text: {
    color: '#94A3B8',
    fontSize: TYPOGRAPHY.sizes.sm,
    fontFamily: TYPOGRAPHY.fontBody,
  },
})
