// Haptic Vibration Controller for Web & Mobile Devices

class HapticController {
  private isSupported(): boolean {
    return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  // Light crisp tap for regular buttons, toggles, chips
  public tap(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(12);
    } catch (e) {
      // Ignore vibration errors if blocked by browser policy
    }
  }

  // Subtle tick for range sliders
  public tick(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(10);
    } catch (e) {}
  }

  // Double-jolt for bottle open / crown cork plopp
  public bottlePop(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([15, 35, 45]);
    } catch (e) {}
  }

  // Clinking glasses vibration
  public cheers(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([25, 70, 40]);
    } catch (e) {}
  }

  // Fail buzzer vibration for 0 points / sad trombone
  public failBuzz(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([120, 60, 180]);
    } catch (e) {}
  }

  // Satisfying confirmation (Double-tap) when submitting rating
  public success(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([25, 45, 35]);
    } catch (e) {}
  }

  // Building accelerating rhythmic vibration for drumroll suspense
  public drumroll(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([20, 60, 25, 45, 30, 35, 40, 25, 60, 15, 120]);
    } catch (e) {}
  }

  // Celebratory fanfare pattern on beer reveal & tada
  public tada(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([35, 50, 40, 50, 90]);
    } catch (e) {}
  }

  // Strong attention buzz for minigames / water alarm
  public alarm(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([80, 50, 100]);
    } catch (e) {}
  }

  // Soft warning buzz
  public warning(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate([30, 40, 30]);
    } catch (e) {}
  }
}

export const haptic = new HapticController();
