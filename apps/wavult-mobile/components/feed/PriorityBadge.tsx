import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../constants/theme'

type Props = { score: number }

export function PriorityBadge({ score }: Props) {
  const color = score > 80 ? theme.colors.error : score >= 50 ? theme.colors.warning : theme.colors.success
  const dot = score > 80 ? '🔴' : score >= 50 ? '🟡' : '🟢'

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={styles.dot}>{dot}</Text>
      <Text style={[styles.score, { color }]}>{score}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  dot: {
    fontSize: 10,
  },
  score: {
    fontSize: 12,
    fontWeight: '700',
  },
})
