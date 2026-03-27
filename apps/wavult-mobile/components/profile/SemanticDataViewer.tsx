import { View, Text, StyleSheet } from 'react-native'
import { theme } from '../../constants/theme'
import type { SemanticProfile } from '../../lib/store'

type Props = { profile: SemanticProfile }

export function SemanticDataViewer({ profile }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>SEMANTISK PROFIL</Text>
      <View style={styles.rows}>
        <Row label="Beslutsstil" value={profile.decisionStyle} />
        <Row label="Fokustid" value={profile.focusHours} />
        <Row label="Delegationsnivå" value={profile.delegationLevel} />
        <Row label="Riskaptit" value={profile.riskAppetite} />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.lg }]}>
        BESLUTSHISTORIK
      </Text>
      {profile.decisionHistory.slice(0, 3).map((item, i) => (
        <View key={i} style={styles.historyItem}>
          <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
          <Text style={styles.historyAction}>{item.action}</Text>
        </View>
      ))}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  rows: { gap: theme.spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowLabel: { color: theme.colors.textSecondary, fontSize: 14 },
  rowValue: { color: theme.colors.text, fontSize: 14, fontWeight: '500' },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 2,
  },
  historyDate: { color: theme.colors.accentLight, fontSize: 12 },
  historyAction: { color: theme.colors.textSecondary, fontSize: 13 },
})
