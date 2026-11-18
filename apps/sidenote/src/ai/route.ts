// The routing table, in one place: which Firebase AI Logic mode each agent uses, and what must be true
// before text may leave the device. Web, Android and iOS adapters call generate(); none decides routing.
import { onDeviceOnly } from '@sidenote/private-evidence';
import { isBuiltPayload, type Payload } from './payload';

export type Mode = 'only_on_device' | 'only_in_cloud' | 'prefer_on_device' | 'prefer_in_cloud';
export type Route = keyof typeof ROUTES;

export const ROUTES = {
  /** The chat window: holds other people's words, so it runs on the device or not at all. */
  reader: { mode: 'only_on_device', needsApproval: false },
  /** The patient's own words, sent only after they saw the exact text (no on-device model here). */
  readerOwnCloud: { mode: 'only_in_cloud', needsApproval: true },
  /** One approved phrase of own words -> a vocabulary term: on-device first, cloud fallback (Plan B, Nov 18). */
  coder: { mode: 'prefer_on_device', needsApproval: true },
  /** Approved, allowlisted JSON of confirmed facts: cloud first, on-device when offline. */
  ranker: { mode: 'prefer_in_cloud', needsApproval: true },
} as const satisfies Record<string, { mode: Mode; needsApproval: boolean }>;

const APPROVED = Symbol('approved');
/** Text the person approved on the outbound screen, for one route. Only approve() makes one. */
export interface Approved { readonly route: Route; readonly text: string; readonly [APPROVED]: true }
/** Called by the outbound approval screen with the payload the person saw. Only builder output can be approved. */
export function approve(payload: Payload): Approved {
  if (!isBuiltPayload(payload)) throw new Error('approve: only payloads made by the payload builder can be approved');
  return Object.freeze({ route: payload.route, text: payload.text, [APPROVED]: true as const });
}
const isApproved = (x: unknown): x is Approved => typeof x === 'object' && x !== null && (x as any)[APPROVED] === true;

export interface ModelParams { onDeviceParams?: unknown; inCloudParams?: unknown }
export type ModelFactory = (mode: Mode, params: ModelParams) => {
  generateContent(text: string): Promise<{ response: { text(): string; inferenceSource?: string } }>;
};

/** One row per model call. Device rows never keep text (it may contain the chat); approved payloads are kept. */
export interface LedgerRow { route: Route; ranWhere: 'device' | 'cloud'; ms: number; bytes: number; payload?: string }

export function createRouter(factory: ModelFactory, ledger: LedgerRow[] = [], g: any = globalThis) {
  return {
    ledger,
    async generate(route: Route, input: string | Approved, params: ModelParams = {}) {
      const { mode, needsApproval } = ROUTES[route];
      if (needsApproval) {
        if (!isApproved(input)) throw new Error(`${route}: needs an approved payload; nothing was sent`);
        if (input.route !== route) throw new Error(`${route}: payload was approved for ${input.route}; nothing was sent`);
      }
      const text = isApproved(input) ? input.text : input;
      const call = () => factory(mode, params).generateContent(text);
      const t0 = performance.now();
      const result = mode === 'only_on_device' ? await onDeviceOnly(call, g) : await call();
      const ranWhere = result.response.inferenceSource === 'on_device' ? 'device' : 'cloud'; // unknown counts as cloud
      ledger.push({ route, ranWhere, ms: Math.round(performance.now() - t0), bytes: new TextEncoder().encode(text).length,
        ...(needsApproval ? { payload: text } : {}) });
      return result.response;
    },
  };
}
