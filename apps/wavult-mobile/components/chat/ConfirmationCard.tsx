import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { theme } from '../../constants/theme'

type Props = {
  action: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmationCard({ action, onConfirm, onCancel }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>⚡ High-impact action</Text>
      <Text style={styles.action}>{action}</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Avbryt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
          <Text style={styles.confirmText}>Bekräfta</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.warning,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  action: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.sm,
    padding: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})
