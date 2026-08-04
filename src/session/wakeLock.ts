/** Keeps the screen on during a session; silently no-ops where unsupported. */
export class ScreenWakeLock {
  private sentinel: WakeLockSentinel | null = null;
  private wanted = false;
  private onVisibility = () => {
    if (this.wanted && document.visibilityState === 'visible') {
      void this.acquire();
    }
  };

  async request(): Promise<void> {
    this.wanted = true;
    document.addEventListener('visibilitychange', this.onVisibility);
    await this.acquire();
  }

  private async acquire(): Promise<void> {
    try {
      this.sentinel = (await navigator.wakeLock?.request('screen')) ?? null;
    } catch {
      this.sentinel = null;
    }
  }

  release(): void {
    this.wanted = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.sentinel?.release().catch(() => {});
    this.sentinel = null;
  }
}
