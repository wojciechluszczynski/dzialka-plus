import { View, Text, StyleSheet } from 'react-native'
import { COLORS, TYPOGRAPHY, SPACING } from '@de/ui'

export function OfflineBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        📡 Brak połączenia — wyświetlam dane z pamięci podręcznej
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.warning + '22',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warning + '33',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING['2xl'],
    alignItems: 'center',
  },
  text: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
    textAlign: 'center',
  },
})
