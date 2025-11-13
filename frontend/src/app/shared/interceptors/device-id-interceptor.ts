import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DeviceIdService } from '@services/device-id.service';

export const deviceIdInterceptor: HttpInterceptorFn = (req, next) => {
  const deviceIdService = inject(DeviceIdService);

  // Check if the request URL includes /orders/ (case insensitive)
  const isOrderRequest = req.url.toLowerCase().includes('/orders/');

  if (isOrderRequest) {
    const deviceId = deviceIdService.getValidDeviceId();

    if (deviceId) {
      // Clone the request and add the X-Device-ID header
      const clonedReq = req.clone({
        headers: req.headers.set('X-Device-ID', deviceId),
      });
      return next(clonedReq);
    }
  }

  // For non-order requests or when no device ID exists, pass through unchanged
  return next(req);
};
