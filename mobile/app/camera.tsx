import { useEffect, useState } from 'react';
import { View, StyleSheet, BackHandler, ActivityIndicator, Text } from 'react-native';
import { router } from 'expo-router';
import { ReceiptScanner, BatchExpenseReview } from '../components';
import { api } from '../services/api';
import { useToastStore } from '../stores/toastStore';
import { useTheme } from '../theme';
import type { Config } from '../types';

export default function CameraRoute() {
  const { colors } = useTheme();
  const toast = useToastStore();
  const [config, setConfig] = useState<Config | null>(null);
  const [showReceiptScanner, setShowReceiptScanner] = useState(true);
  const [showBatchReview, setShowBatchReview] = useState(false);
  const [batchExpenses, setBatchExpenses] = useState<Array<{ name: string; amount: number; category: string; date: string; confidence?: number }>>([]);

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

  const handleReceiptParsed = (
    expense: { name: string; amount: number; category: string; date: string; confidence: number },
    _merchant: string,
    _items: Array<{ description: string; quantity: number; amount: number }>
  ) => {
    setShowReceiptScanner(false);
    setBatchExpenses([expense]);
    setShowBatchReview(true);
  };

  const handleError = (message: string) => {
    toast.error(message);
    handleClose();
  };

  const handleBatchSave = () => {
    toast.success('Expense saved');
    setShowBatchReview(false);
    handleClose();
  };

  return (
    <View style={styles.container}>
      <ReceiptScanner
        visible={showReceiptScanner}
        onClose={handleClose}
        onReceiptParsed={handleReceiptParsed}
        onError={handleError}
        parseReceipt={api.parseReceiptImage.bind(api)}
      />
      <BatchExpenseReview
        visible={showBatchReview}
        onClose={() => {
          setShowBatchReview(false);
          handleClose();
        }}
        onSave={handleBatchSave}
        expenses={batchExpenses}
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
});
