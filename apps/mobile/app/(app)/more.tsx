import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'

interface MenuSection {
  title: string
  items: MenuItem[]
}

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  danger?: boolean
}

export default function MoreScreen() {
  const { user, workspaceCtx, signOut } = useAuth()
  const router = useRouter()

  const sections: MenuSection[] = [
    {
      title: 'Workspace',
      items: [
        {
          icon: 'settings-outline',
          label: 'Ustawienia workspace',
          onPress: () => router.push('/(app)/settings' as never),
        },
        {
          icon: 'people-outline',
          label: 'Zaproś partnera',
          onPress: () => router.push('/(app)/invite-partner' as never),
        },
        {
          icon: 'swap-horizontal-outline',
          label: 'Wagi scoringu',
          onPress: () => router.push('/(app)/scoring-weights' as never),
        },
      ],
    },
    {
      title: 'Działki',
      items: [
        {
          icon: 'list-outline',
          label: 'Wszystkie działki',
          onPress: () => router.push('/(app)/all-plots' as never),
        },
        {
          icon: 'bar-chart-outline',
          label: 'Porównaj działki',
          onPress: () => router.push('/(app)/compare' as never),
        },
        {
          icon: 'location-outline',
          label: 'Targety dojazdu',
          onPress: () => router.push('/(app)/commute-targets' as never),
        },
      ],
    },
    {
      title: 'Konto',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Wyloguj się',
          danger: true,
          onPress: () => {
            Alert.alert('Wyloguj się', 'Czy na pewno chcesz się wylogować?', [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Wyloguj', style: 'destructive', onPress: signOut },
            ])
          },
        },
      ],
    },
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.email?.[0]?.toUpperCase() ?? 'W'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userRole}>
              {workspaceCtx.role === 'owner' ? '👑 Owner' : '✏️ Editor'}
            </Text>
          </View>
        </View>

        {/* Workspace info */}
        <View style={styles.wsCard}>
          <Text style={styles.wsLabel}>Workspace</Text>
          <Text style={styles.wsName}>{workspaceCtx.workspace?.name ?? '—'}</Text>
        </View>

        {/* Menu sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.menuItem}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={item.danger ? COLORS.error : COLORS.textSecondary}
                    />
                    <Text style={[styles.menuItemLabel, item.danger && styles.menuItemDanger]}>
                      {item.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>DecisionEngine v1.0.0 · Sprint 0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.c0 },
  content: { padding: SPACING['2xl'], paddingBottom: 100, gap: SPACING.base },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.base,
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.accent, fontWeight: TYPOGRAPHY.weights.bold, fontSize: TYPOGRAPHY.sizes.lg },
  userInfo: { gap: 2 },
  userEmail: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.medium },
  userRole: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  wsCard: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  wsLabel: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  wsName: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  section: { gap: SPACING.sm },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: TYPOGRAPHY.weights.medium,
    paddingHorizontal: SPACING.sm,
  },
  sectionItems: {
    backgroundColor: COLORS.c1,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  menuItemLabel: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base },
  menuItemDanger: { color: COLORS.error },
  version: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center', marginTop: SPACING.md },
})
