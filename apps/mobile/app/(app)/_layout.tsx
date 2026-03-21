import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native'
import { Tabs, useRouter } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, TYPOGRAPHY, SPACING, RADII } from '@de/ui'
import QuickAddModal from '../../screens/QuickAddModal'

// ─── Bottom Nav Tab Bar ────────────────────────────────────────────────────────

interface TabItem {
  name: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  iconFocused: keyof typeof Ionicons.glyphMap
}

const TABS: TabItem[] = [
  { name: 'index',    label: 'Home',      icon: 'home-outline',      iconFocused: 'home' },
  { name: 'inbox',    label: 'Inbox',     icon: 'mail-outline',      iconFocused: 'mail' },
  { name: '__add__',  label: '',          icon: 'add',               iconFocused: 'add' },
  { name: 'shortlist',label: 'Shortlista',icon: 'star-outline',      iconFocused: 'star' },
  { name: 'more',     label: 'Więcej',    icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal' },
]

function BottomTabBar() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [quickAddVisible, setQuickAddVisible] = useState(false)

  // Current route detection simplified — Expo Router provides focused state via hook
  // For Sprint 0 we use manual active state; real implementation uses usePathname()
  const [activeTab, setActiveTab] = useState<string>('index')

  function handleTabPress(tab: TabItem) {
    if (tab.name === '__add__') {
      setQuickAddVisible(true)
      return
    }
    setActiveTab(tab.name)
    const route = tab.name === 'index' ? '/(app)/' : `/(app)/${tab.name}`
    router.push(route as never)
  }

  return (
    <>
      <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom }]}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.c1 }]} />
        )}
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => {
            if (tab.name === '__add__') {
              return (
                <TouchableOpacity
                  key="add"
                  style={styles.fabWrapper}
                  onPress={() => setQuickAddVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.fab}>
                    <Ionicons name="add" size={28} color="#fff" />
                  </View>
                </TouchableOpacity>
              )
            }

            const focused = activeTab === tab.name
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={22}
                  color={focused ? COLORS.accent : COLORS.textMuted}
                />
                <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* Quick Add Modal */}
      <Modal
        visible={quickAddVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickAddVisible(false)}
      >
        <QuickAddModal onClose={() => setQuickAddVisible(false)} />
      </Modal>
    </>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function AppLayout() {
  return (
    <Tabs
      tabBar={() => <BottomTabBar />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="shortlist" />
      <Tabs.Screen name="more" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: SPACING.sm,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20, // raise FAB above nav bar
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
})
