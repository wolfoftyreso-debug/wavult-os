import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../constants/theme'

type Props = {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  onMic?: () => void
  disabled?: boolean
}

export function InputBar({ value, onChangeText, onSend, onMic, disabled }: Props) {
  const canSend = value.trim().length > 0 && !disabled

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.micBtn} onPress={onMic} disabled={disabled}>
        <Ionicons name="mic-outline" size={22} color={disabled ? theme.colors.textMuted : theme.colors.textSecondary} />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Skriv meddelande..."
        placeholderTextColor={theme.colors.textMuted}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="send"
        onSubmitEditing={canSend ? onSend : undefined}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
        onPress={onSend}
        disabled={!canSend}
      >
        <Ionicons name="arrow-up" size={18} color={canSend ? '#fff' : theme.colors.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  micBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 120,
    minHeight: 38,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  sendBtnInactive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
})
