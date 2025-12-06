import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { useTheme, spacing, fontSize, borderRadius } from '../theme';
import { hapticLight, hapticSuccess, hapticError } from '../utils/haptics';
import { Button } from './Button';

interface ReceiptScannerProps {
  visible: boolean;
  onClose: () => void;
  onReceiptParsed: (expense: {
    name: string;
    amount: number;
    category: string;
    date: string;
    confidence: number;
  }, merchant: string, items: Array<{ description: string; quantity: number; amount: number }>) => void;
  onError: (message: string) => void;
  parseReceipt: (imageBase64: string, mimeType: string) => Promise<{
    expense: {
      name: string;
      amount: number;
      category: string;
      date: string;
      confidence: number;
      ambiguous: boolean;
    } | null;
    merchant: string;
    receiptDate: string;
    items: Array<{ description: string; quantity: number; amount: number }>;
    needsReview: boolean;
    message: string;
  }>;
}

export function ReceiptScanner({ visible, onClose, onReceiptParsed, onError, parseReceipt }: ReceiptScannerProps) {
  const { colors } = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        onError(useCamera ? 'Camera permission is required' : 'Photo library permission is required');
        return;
      }

      hapticLight();

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: false,
          });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      hapticError();
      onError('Failed to pick image');
    }
  };

  const processReceipt = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    hapticLight();

    try {
      // Read the image as base64
      const base64 = await readAsStringAsync(selectedImage, {
        encoding: 'base64',
      });

      // Determine MIME type from extension
      const extension = selectedImage.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      // Call the API
      const response = await parseReceipt(base64, mimeType);

      if (!response.expense) {
        hapticError();
        onError(response.message || 'Could not parse receipt. Please try again with a clearer image.');
        return;
      }

      hapticSuccess();
      onReceiptParsed(
        {
          name: response.expense.name,
          amount: response.expense.amount,
          category: response.expense.category,
          date: response.expense.date,
          confidence: response.expense.confidence,
        },
        response.merchant,
        response.items
      );
      handleClose();
    } catch (error) {
      console.error('Error processing receipt:', error);
      hapticError();
      onError('Failed to process receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedImage(null);
    setIsProcessing(false);
    onClose();
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Scan Receipt</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!selectedImage ? (
            <View style={styles.content}>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                Take a photo of your receipt or select from your gallery
              </Text>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.optionButton, { backgroundColor: colors.primary }]}
                  onPress={() => pickImage(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={32} color="#fff" />
                  <Text style={styles.optionText}>Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.optionButton, { backgroundColor: colors.primary }]}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images" size={32} color="#fff" />
                  <Text style={styles.optionText}>Gallery</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.hint, { color: colors.textTertiary }]}>
                For best results, ensure the receipt is well-lit and the total is clearly visible
              </Text>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />

              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.processingText, { color: colors.text }]}>
                    Analyzing receipt...
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            {selectedImage ? (
              <>
                <Button variant="ghost" onPress={clearImage} disabled={isProcessing}>
                  Retake
                </Button>
                <Button onPress={processReceipt} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Scan Receipt'}
                </Button>
              </>
            ) : (
              <Button variant="ghost" onPress={handleClose}>
                Cancel
              </Button>
            )}
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
    maxHeight: '90%',
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
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  optionButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  optionText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  hint: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: spacing.md,
  },
  previewContainer: {
    position: 'relative',
    width: '100%',
    height: 300,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  processingText: {
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
});
