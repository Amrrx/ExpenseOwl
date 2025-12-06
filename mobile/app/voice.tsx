import { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { VoiceRecorder, BatchExpenseReview } from '../components';
import { api } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../theme';
import type { Config } from '../types';

export default function VoiceRoute() {
  const { colors } = useTheme();
  const toast = useToastStore();
  const [config, setConfig] = useState<Config | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(true);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [showBatchReview, setShowBatchReview] = useState(false);
  const [batchExpenses, setBatchExpenses] = useState<Array<{ name: string; amount: number; category: string; date: string; confidence?: number }>>([]);
  const [batchTranscript, setBatchTranscript] = useState<string | undefined>();

  useEffect(() => {
    loadConfig();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await api.getConfig();
      setConfig(cfg);
    } catch {
      // Use defaults
    }
  };

  const handleClose = () => {
    router.replace('/');
  };

  const handleRecordingComplete = async (uri: string) => {
    setShowVoiceRecorder(false);
    setIsParsingVoice(true);
    try {
      const result = await api.parseVoiceExpense(uri);
      if (result.expenses && result.expenses.length > 0) {
        setBatchExpenses(result.expenses);
        setBatchTranscript(result.transcript);
        setShowBatchReview(true);
      } else {
        toast.error('Could not parse expense from voice');
        handleClose();
      }
    } catch {
      toast.error('Failed to process voice input');
      handleClose();
    } finally {
      setIsParsingVoice(false);
    }
  };

  const handleBatchSave = () => {
    toast.success('Expenses saved');
    setShowBatchReview(false);
    handleClose();
  };

  if (isParsingVoice) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Processing voice...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VoiceRecorder
        visible={showVoiceRecorder}
        onClose={handleClose}
        onRecordingComplete={handleRecordingComplete}
      />
      <BatchExpenseReview
        visible={showBatchReview}
        onClose={() => {
          setShowBatchReview(false);
          handleClose();
        }}
        onSave={handleBatchSave}
        expenses={batchExpenses}
        transcript={batchTranscript}
        config={config}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
