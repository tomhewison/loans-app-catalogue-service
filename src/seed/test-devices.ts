import { Device, DeviceStatus, createDevice } from '../domain/entities/device';

/**
 * Test data for device instances
 * Creates multiple device instances for each device model
 */
export function generateTestDevices(): Device[] {
  const devices: Device[] = [];
  const now = new Date();
  
  // Dell XPS 13 devices (5 instances)
  for (let i = 1; i <= 5; i++) {
    devices.push(createDevice({
      id: `device-dell-xps-13-${i}`,
      deviceModelId: 'laptop-dell-xps-13',
      serialNumber: `DLXPS13${String(i).padStart(3, '0')}`,
      assetId: `ASSET-DELL-XPS-13-${i}`,
      status: i <= 3 ? DeviceStatus.Available : DeviceStatus.Unavailable,
      condition: 'Excellent',
      notes: i === 4 ? 'Currently on loan' : undefined,
      purchaseDate: new Date(now.getFullYear() - 1, 0, 15 + i),
    }));
  }
  
  // MacBook Air M2 devices (4 instances)
  for (let i = 1; i <= 4; i++) {
    devices.push(createDevice({
      id: `device-macbook-air-m2-${i}`,
      deviceModelId: 'laptop-macbook-air-m2',
      serialNumber: `MBAM2${String(i).padStart(3, '0')}`,
      assetId: `ASSET-MBA-M2-${i}`,
      status: i <= 2 ? DeviceStatus.Available : DeviceStatus.Maintenance,
      condition: 'Like New',
      notes: i === 3 ? 'Screen replacement scheduled' : undefined,
      purchaseDate: new Date(now.getFullYear() - 1, 2, 10 + i),
    }));
  }
  
  // Lenovo ThinkPad X1 devices (6 instances)
  for (let i = 1; i <= 6; i++) {
    devices.push(createDevice({
      id: `device-thinkpad-x1-${i}`,
      deviceModelId: 'laptop-lenovo-thinkpad-x1',
      serialNumber: `TPX1${String(i).padStart(3, '0')}`,
      assetId: `ASSET-TP-X1-${i}`,
      status: i <= 4 ? DeviceStatus.Available : DeviceStatus.Unavailable,
      condition: 'Good',
      purchaseDate: new Date(now.getFullYear() - 2, 5, 20 + i),
    }));
  }
  
  // iPad Air devices (3 instances)
  for (let i = 1; i <= 3; i++) {
    devices.push(createDevice({
      id: `device-ipad-air-${i}`,
      deviceModelId: 'tablet-ipad-air',
      serialNumber: `IPADAIR${String(i).padStart(3, '0')}`,
      assetId: `ASSET-IPAD-AIR-${i}`,
      status: i <= 2 ? DeviceStatus.Available : DeviceStatus.Available,
      condition: 'Excellent',
      purchaseDate: new Date(now.getFullYear() - 1, 8, 5 + i),
    }));
  }
  
  // Surface Pro devices (4 instances)
  for (let i = 1; i <= 4; i++) {
    devices.push(createDevice({
      id: `device-surface-pro-${i}`,
      deviceModelId: 'tablet-surface-pro',
      serialNumber: `SPRO${String(i).padStart(3, '0')}`,
      assetId: `ASSET-SP-${i}`,
      status: i <= 3 ? DeviceStatus.Available : DeviceStatus.Unavailable,
      condition: 'Very Good',
      purchaseDate: new Date(now.getFullYear() - 1, 10, 15 + i),
    }));
  }
  
  // Canon EOS R6 devices (2 instances)
  for (let i = 1; i <= 2; i++) {
    devices.push(createDevice({
      id: `device-canon-eos-r6-${i}`,
      deviceModelId: 'camera-canon-eos-r6',
      serialNumber: `CANR6${String(i).padStart(3, '0')}`,
      assetId: `ASSET-CAN-R6-${i}`,
      status: DeviceStatus.Available,
      condition: 'Excellent',
      notes: 'Includes battery and charger',
      purchaseDate: new Date(now.getFullYear() - 1, 3, 1 + i),
    }));
  }
  
  // Sony A7 III devices (2 instances)
  for (let i = 1; i <= 2; i++) {
    devices.push(createDevice({
      id: `device-sony-a7iii-${i}`,
      deviceModelId: 'camera-sony-a7iii',
      serialNumber: `SONYA7${String(i).padStart(3, '0')}`,
      assetId: `ASSET-SONY-A7-${i}`,
      status: i === 1 ? DeviceStatus.Available : DeviceStatus.Maintenance,
      condition: 'Good',
      notes: i === 2 ? 'Sensor cleaning required' : undefined,
      purchaseDate: new Date(now.getFullYear() - 2, 1, 10 + i),
    }));
  }
  
  // iPhone 14 devices (3 instances)
  for (let i = 1; i <= 3; i++) {
    devices.push(createDevice({
      id: `device-iphone-14-${i}`,
      deviceModelId: 'phone-iphone-14',
      serialNumber: `IPH14${String(i).padStart(3, '0')}`,
      assetId: `ASSET-IPH-14-${i}`,
      status: DeviceStatus.Available,
      condition: 'Like New',
      purchaseDate: new Date(now.getFullYear() - 1, 8, 20 + i),
    }));
  }
  
  // Logitech MX Keys keyboards (5 instances)
  for (let i = 1; i <= 5; i++) {
    devices.push(createDevice({
      id: `device-logitech-mx-keys-${i}`,
      deviceModelId: 'keyboard-logitech-mx',
      serialNumber: `LMXK${String(i).padStart(3, '0')}`,
      assetId: `ASSET-LMX-K-${i}`,
      status: DeviceStatus.Available,
      condition: 'Very Good',
      purchaseDate: new Date(now.getFullYear() - 1, 6, 1 + i),
    }));
  }
  
  // Logitech MX Master 3 mice (5 instances)
  for (let i = 1; i <= 5; i++) {
    devices.push(createDevice({
      id: `device-mx-master-3-${i}`,
      deviceModelId: 'mouse-logitech-mx-master',
      serialNumber: `LMXM${String(i).padStart(3, '0')}`,
      assetId: `ASSET-LMX-M-${i}`,
      status: DeviceStatus.Available,
      condition: 'Very Good',
      purchaseDate: new Date(now.getFullYear() - 1, 6, 1 + i),
    }));
  }
  
  // Anker 65W Chargers (8 instances)
  for (let i = 1; i <= 8; i++) {
    devices.push(createDevice({
      id: `device-anker-65w-${i}`,
      deviceModelId: 'charger-usb-c-65w',
      serialNumber: `ANK65${String(i).padStart(3, '0')}`,
      assetId: `ASSET-ANK-65W-${i}`,
      status: DeviceStatus.Available,
      condition: 'Good',
      purchaseDate: new Date(now.getFullYear() - 1, 4, 10 + i),
    }));
  }
  
  return devices;
}

