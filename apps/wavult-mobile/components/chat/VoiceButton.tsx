/**
 * VoiceButton.tsx — Röstinspelning → Whisper → Bernt
 *
 * Håll inne knappen för att spela in.
 * Släpp för att transkribera och skicka till Bernt.
 */

import { useState, useRef, useEffect } from 'react'
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Text,
  Platform,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Audio } from 'expo-av'
import { transcribeAudio } from '../../lib/bernt'
import { theme } from '../../constants/theme'

type Props = {
  onTranscribed: (text: string) => void
  disabled?: boolean
}

export function VoiceButton({ onTranscribed, disabled }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

  // Pulsanimation medan man spelar in
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      )
      pulseLoop.current.start()
    } else {
      pulseLoop.current?.stop()
      pulseAnim.setValue(1)
    }
  }, [isRecording])

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('Mikrofon', 'Mikrofontillstånd krävs för röstkommandon.')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      recordingRef.current = recording
      setIsRecording(true)
    } catch (err) {
      console.error('Inspelningsfel:', err)
      Alert.alert('Fel', 'Kunde inte starta inspelning.')
    }
  }

  async function stopAndTranscribe() {
    if (!recordingRef.current) return
    setIsRecording(false)
    setIsProcessing(true)

    try {
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      recordingRef.current = null

      if (!uri) throw new Error('Ingen inspelningsfil')

      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })

      const text = await transcribeAudio(uri)
      if (text.trim()) {
        onTranscribed(text.trim())
      }
    } catch (err) {
      console.error('Transkriptionsfel:', err)
      // Fallback — låt användaren skriva manuellt
    } finally {
      setIsProcessing(false)
    }
  }

  const iconColor = isRecording
    ? '#ff4444'
    : isProcessing
    ? theme.colors.textMuted
    : disabled
    ? theme.colors.textMuted
    : theme.colors.textSecondary

  const iconName = isProcessing
    ? 'hourglass-outline'
    : isRecording
    ? 'radio-button-on'
    : 'mic-outline'

  return (
    <TouchableOpacity
      onPressIn={disabled || isProcessing ? undefined : startRecording}
      onPressOut={isRecording ? stopAndTranscribe : undefined}
      disabled={disabled || isProcessing}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.micBtn,
          isRecording && styles.micBtnRecording,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Ionicons name={iconName} size={22} color={iconColor} />
        {isRecording && (
          <View style={styles.recordingIndicator} />
        )}
      </Animated.View>
      {isProcessing && (
        <Text style={styles.processingText}>Lyssnar...</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  micBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  micBtnRecording: {
    backgroundColor: 'rgba(255,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.4)',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4444',
  },
  processingText: {
    position: 'absolute',
    bottom: -16,
    left: '50%',
    transform: [{ translateX: -28 }],
    fontSize: 10,
    color: theme.colors.textMuted,
    width: 56,
    textAlign: 'center',
  },
})
