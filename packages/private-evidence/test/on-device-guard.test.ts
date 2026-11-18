import { describe, it, expect, vi } from 'vitest';
import { onDeviceOnly, OnDeviceUnavailable } from '../src/on-device-guard';

const reply = (inferenceSource: string) => async () => ({ response: { inferenceSource, text: () => 'x' } });
const lm = (availability: string) => ({ LanguageModel: { availability: async () => availability } });

describe('onDeviceOnly (the SDK sends ONLY_ON_DEVICE to the cloud when LanguageModel is missing)', () => {
  it('never calls the model when the browser has no LanguageModel (WebView, Safari, Firefox)', async () => {
    const call = vi.fn(reply('on_device'));
    await expect(onDeviceOnly(call, {})).rejects.toBeInstanceOf(OnDeviceUnavailable);
    expect(call).not.toHaveBeenCalled();
  });

  it.each(['downloadable', 'downloading', 'unavailable'])('never calls the model when availability is %s', async a => {
    const call = vi.fn(reply('on_device'));
    await expect(onDeviceOnly(call, lm(a))).rejects.toBeInstanceOf(OnDeviceUnavailable);
    expect(call).not.toHaveBeenCalled();
  });

  it('treats a throwing availability() as unavailable', async () => {
    const call = vi.fn(reply('on_device'));
    const g = { LanguageModel: { availability: async () => { throw new Error('boom'); } } };
    await expect(onDeviceOnly(call, g)).rejects.toBeInstanceOf(OnDeviceUnavailable);
    expect(call).not.toHaveBeenCalled();
  });

  it('calls the model and returns its result when the on-device model is available', async () => {
    const r = await onDeviceOnly(reply('on_device'), lm('available'));
    expect(r.response.inferenceSource).toBe('on_device');
  });

  it('throws if a guarded call still reports a cloud answer (detects any other routing leak)', async () => {
    await expect(onDeviceOnly(reply('in_cloud'), lm('available'))).rejects.toThrow(/in_cloud/);
  });
});
