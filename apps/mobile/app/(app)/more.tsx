import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
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
  const isAnonymous = !user?.email
  const [upgradeVisible, setUpgradeVisible] = useState(false)
  const [upgradeEmail, setUpgradeEmail] = useState('')
  const [upgradeSent, setUpgradeSent] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  async function handleUpgrade() {
    if (!upgradeEmail.trim()) {
      setUpgradeError('Podaj adres email')
      return
    }
    setUpgradeLoading(true)
    setUpgradeError(null)
    const { error } = await supabase.auth.updateUser({ email: upgradeEmail.trim().toLowerCase() })
    setUpgradeLoading(false)
    if (error) {
      setUpgradeError(error.message)
    } else {
      setUpgradeSent(true)
    }
  }

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
        ...(isAnonymous ? [{
          icon: 'mail-outline' as const,
          label: 'Dodaj email do konta',
          onPress: () => { setUpgradeSent(false); setUpgradeEmail(''); setUpgradeError(null); setUpgradeVisible(true) },
        }] : []),
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
      {/* Upgrade email modal */}
      <Modal visible={upgradeVisible} transparent animationType="slide" onRequestClose={() => setUpgradeVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {!upgradeSent ? (
              <>
                <Text style={styles.modalTitle}>Dodaj email do konta</Text>
                <Text style={styles.modalSubtitle}>
                  Twoje dane działek zostaną zachowane. Wyślemy Ci link potwierdzający.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="twoj@email.com"
                  placeholderTextColor={COLORS.textMuted}
                  value={upgradeEmail}
                  onChangeText={setUpgradeEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {upgradeError && <Text style={styles.modalError}>{upgradeError}</Text>}
                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUpgradeVisible(false)}>
                    <Text style={styles.modalCancelText}>Anuluj</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalConfirmBtn, upgradeLoading && { opacity: 0.6 }]}
                    onPress={handleUpgrade}
                    disabled={upgradeLoading}
                  >
                    {upgradeLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.modalConfirmText}>Wyślij link</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSentIcon}>📨</Text>
                <Text style={styles.modalTitle}>Sprawdź skrzynkę!</Text>
                <Text style={styles.modalSubtitle}>
                  Link potwierdzający wysłany na{'\n'}
                  <Text style={{ color: COLORS.accent }}>{upgradeEmail}</Text>
                </Text>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => setUpgradeVisible(false)}>
                  <Text style={styles.modalConfirmText}>Gotowe</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Guest banner */}
        {isAnonymous && (
          <TouchableOpacity
            style={styles.guestBanner}
            onPress={() => { setUpgradeSent(false); setUpgradeEmail(''); setUpgradeError(null); setUpgradeVisible(true) }}
            activeOpacity={0.8}
          >
            <Text style={styles.guestBannerIcon}>👻</Text>
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Tryb gościa</Text>
              <Text style={styles.guestBannerSub}>Dotknij aby dodać email i zabezpieczyć dane</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
          </TouchableOpacity>
        )}

        {/* User card */}
        <View style={styles.userCard}>
          <View style={[styles.avatar, isAnonymous && styles.avatarGuest]}>
            <Text style={styles.avatarText}>
              {isAnonymous ? '👻' : (user?.email?.[0]?.toUpperCase() ?? '?')}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>
              {isAnonymous ? 'Gość (bez konta)' : user?.email}
            </Text>
            <Text style={styles.userRole}>
              {isAnonymous ? '🔓 Konto tymczasowe' : workspaceCtx.role === 'owner' ? '👑 Owner' : '✏️ Editor'}
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

  // Guest banner
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.accent + '12',
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
    borderRadius: RADII.md,
    padding: SPACING.base,
  },
  guestBannerIcon: { fontSize: 24 },
  guestBannerText: { flex: 1, gap: 2 },
  guestBannerTitle: { color: COLORS.accent, fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.sm },
  guestBannerSub: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.xs },
  avatarGuest: { backgroundColor: COLORS.c2, borderWidth: 1, borderColor: COLORS.border },

  // Upgrade modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.c1,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: SPACING['2xl'],
    paddingBottom: SPACING['3xl'],
    gap: SPACING.base,
  },
  modalTitle: {
    fontFamily: TYPOGRAPHY.fontHeading,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: COLORS.c0,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADII.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.base,
    marginTop: SPACING.sm,
  },
  modalError: { color: COLORS.error, fontSize: TYPOGRAPHY.sizes.sm },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.base },
  modalConfirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: RADII.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: TYPOGRAPHY.weights.semibold, fontSize: TYPOGRAPHY.sizes.base },
  modalSentIcon: { fontSize: 48, textAlign: 'center' },
})
