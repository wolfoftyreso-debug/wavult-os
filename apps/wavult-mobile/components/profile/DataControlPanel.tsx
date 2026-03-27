import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { theme } from '../../constants/theme'

type Props = {
  onViewAll: () => void
  onExport: () => void
  onDeleteSemantic: () => void
}

export function DataControlPanel({ onViewAll, onExport, onDeleteSemantic }: Props) {
  function confirmDelete() {
    Alert.alert(
      'Radera semantisk data?',
      'Detta raderar din beslutsprofil och historik permanent.',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Radera', style: 'destructive', onPress: onDeleteSemantic },
      ]
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.btnSecondary} onPress={onViewAll}>
          <Text style={styles.btnSecondaryText}>Se all data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={onExport}>
          <Text style={styles.btnSecondaryText}>Exportera</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.btnDanger} onPress={confirmDelete}>
        <Text style={styles.btnDangerText}>Radera semantisk data</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  btnDanger: {
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  btnDangerText: {
    color: theme.colors.error,
    fontSize: 14,
  },
})
