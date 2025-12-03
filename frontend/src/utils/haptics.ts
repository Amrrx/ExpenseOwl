type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [30, 50, 30],
  error: [50, 100, 50],
};

export function haptic(type: HapticType = 'light'): void {
  if (!('vibrate' in navigator)) return;

  const pattern = hapticPatterns[type];
  navigator.vibrate(pattern);
}

export function hapticLight(): void {
  haptic('light');
}

export function hapticMedium(): void {
  haptic('medium');
}

export function hapticHeavy(): void {
  haptic('heavy');
}

export function hapticSuccess(): void {
  haptic('success');
}

export function hapticWarning(): void {
  haptic('warning');
}

export function hapticError(): void {
  haptic('error');
}
