import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../constants/theme'

type Props = { title: string }

export function DateSectionHeader({ title }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <Text style={styles.text}>{title}</Text>
      <View style={styles.line} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
