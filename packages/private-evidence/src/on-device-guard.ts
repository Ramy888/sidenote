// Firebase AI Logic's JS SDK (checked in 12.19 and 13.3) sends an ONLY_ON_DEVICE request to the cloud
// when the browser has no `LanguageModel` global. Every private-text call goes through this guard.

export class OnDeviceUnavailable extends Error {
  readonly availability: string;
  constructor(availability: string) {
    super(`On-device model not ready (${availability}); private text stays on this device.`);
    this.name = 'OnDeviceUnavailable';
    this.availability = availability;
  }
}

type Guarded = { response: { inferenceSource?: string } };

/** Runs `call` only when the on-device model is ready, and rejects any answer not made on the device. */
export async function onDeviceOnly<T extends Guarded>(call: () => Promise<T>, g: any = globalThis): Promise<T> {
  let availability = 'no-api';
  if (typeof g.LanguageModel?.availability === 'function') {
    try { availability = await g.LanguageModel.availability(); } catch { availability = 'unavailable'; }
  }
  if (availability !== 'available') throw new OnDeviceUnavailable(availability);
  const result = await call();
  const source = result.response.inferenceSource;
  if (source !== 'on_device') throw new Error(`Private call answered by ${source ?? 'an unknown source'}, not on_device`);
  return result;
}
