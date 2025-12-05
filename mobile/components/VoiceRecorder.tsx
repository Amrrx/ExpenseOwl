import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTheme, spacing, fontSize, borderRadius } from '../theme';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { Button } from './Button';

interface VoiceRecorderProps {
  visible: boolean;
  onClose: () => void;
  onRecordingComplete: (uri: string, duration: number) => void;
}

export function VoiceRecorder({ visible, onClose, onRecordingComplete }: VoiceRecorderProps) {
  const { colors } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      checkPermissions();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isRecording, pulseAnim]);

  const checkPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setPermissionGranted(status === 'granted');
    } catch {
      setPermissionGranted(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);
      hapticLight();

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      hapticError();
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      if (uri) {
        hapticSuccess();
        onRecordingComplete(uri, duration);
        onClose();
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      hapticError();
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (recordingRef.current) {
      try {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      } catch {
        // Ignore errors during cancel
      }
    }
    setIsRecording(false);
    setDuration(0);
    onClose();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancelRecording}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Voice Input</Text>
            <TouchableOpacity onPress={cancelRecording} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {permissionGranted === false && (
            <View style={styles.permissionDenied}>
              <Ionicons name="mic-off" size={48} color={colors.danger} />
              <Text style={[styles.permissionText, { color: colors.text }]}>
                Microphone permission is required
              </Text>
              <Text style={[styles.permissionSubtext, { color: colors.textSecondary }]}>
                Please enable microphone access in your device settings
              </Text>
            </View>
          )}

          {permissionGranted === true && (
            <View style={styles.content}>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                {isRecording
                  ? 'Speak your expense clearly...'
                  : 'Tap the button and describe your expense'}
              </Text>

              <View style={styles.recordingArea}>
                <Animated.View
                  style={[
                    styles.recordButtonOuter,
                    { borderColor: isRecording ? colors.danger : colors.primary },
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <TouchableOpacity
                    onPress={isRecording ? stopRecording : startRecording}
                    style={[
                      styles.recordButton,
                      { backgroundColor: isRecording ? colors.danger : colors.primary },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isRecording ? 'stop' : 'mic'}
                      size={32}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </Animated.View>

                <Text style={[styles.duration, { color: colors.text }]}>
                  {formatDuration(duration)}
                </Text>
              </View>

              <Text style={[styles.example, { color: colors.textTertiary }]}>
                Example: "Spent 25 dollars on lunch at the cafe today"
              </Text>
            </View>
          )}

          {permissionGranted === null && (
            <View style={styles.loading}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Checking permissions...
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button variant="ghost" onPress={cancelRecording}>
              Cancel
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  instruction: {
    fontSize: fontSize.base,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  recordingArea: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  recordButtonOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  example: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  permissionDenied: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  permissionText: {
    fontSize: fontSize.base,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  permissionSubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  actions: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
});
