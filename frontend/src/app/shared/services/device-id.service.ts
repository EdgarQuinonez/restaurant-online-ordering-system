// device-id.service.ts
import { Injectable, inject } from '@angular/core';
import { LocalStorageService } from '@services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DeviceIdService {
  private localStorageService = inject(LocalStorageService);

  private readonly DEVICE_ID_KEY = 'device_id';

  /**
   * Get the current device ID from local storage
   */
  getDeviceId(): string | null {
    return this.localStorageService.getItem<string>(this.DEVICE_ID_KEY);
  }

  /**
   * Set the device ID in local storage
   */
  setDeviceId(deviceId: string): void {
    this.localStorageService.setItem(this.DEVICE_ID_KEY, deviceId);
  }

  /**
   * Clear the device ID from local storage
   */
  clearDeviceId(): void {
    this.localStorageService.removeItem(this.DEVICE_ID_KEY);
  }

  /**
   * Check if a device ID exists
   */
  hasDeviceId(): boolean {
    return this.getDeviceId() !== null;
  }

  /**
   * Generate a new device ID (for testing or manual reset)
   */
  generateDeviceId(): string {
    const newDeviceId =
      'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.setDeviceId(newDeviceId);
    return newDeviceId;
  }

  /**
   * Validate device ID format
   */
  isValidDeviceId(deviceId: string): boolean {
    // Basic validation - adjust based on your backend format
    return typeof deviceId === 'string' && deviceId.length > 0;
  }

  /**
   * Get device ID with validation
   * Returns null if device ID is invalid or doesn't exist
   */
  getValidDeviceId(): string | null {
    const deviceId = this.getDeviceId();
    return deviceId && this.isValidDeviceId(deviceId) ? deviceId : null;
  }

  /**
   * Initialize device ID - useful for app startup
   */
  initializeDeviceId(): string | null {
    return this.getValidDeviceId();
  }

  /**
   * Check if device ID needs to be refreshed (optional feature)
   * For example, if device ID is too old
   */
  shouldRefreshDeviceId(): boolean {
    // Implement logic if you want to refresh device IDs after certain time
    // For now, always return false as device IDs should be persistent
    return false;
  }

  /**
   * Get device ID info for debugging
   */
  getDeviceInfo(): { exists: boolean; value: string | null; isValid: boolean } {
    const deviceId = this.getDeviceId();
    return {
      exists: this.hasDeviceId(),
      value: deviceId,
      isValid: deviceId ? this.isValidDeviceId(deviceId) : false,
    };
  }
}
