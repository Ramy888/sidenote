import { describe, it, expect } from 'vitest';
import { buildTimeline, type DatedEvent } from '../src/pipeline/timeline';

const ev = (kind: DatedEvent['kind'], date: string, extra: Partial<DatedEvent> = {}): DatedEvent =>
  ({ kind, medicine: '', symptom: '', quote: '', messageId: 0, sender: 'M', own: true, date, min: date, max: date, basis: 'phrase', ...extra });

describe('buildTimeline', () => {
  it('labels onset, gone and back for one symptom and matches medicines to the confirmed list', () => {
    const t = buildTimeline([
      ev('medicine_started', '2026-03-01', { medicine: 'Atorvastatin 20mg' }),
      ev('symptom_started', '2026-03-14', { symptom: 'legs ache' }),
      ev('symptom_ongoing', '2026-03-20', { symptom: 'aching legs' }),
      ev('symptom_started', '2026-03-15', { symptom: 'aching legs' }),
      ev('medicine_stopped', '2026-03-31', { medicine: 'atorvastatin' }),
      ev('symptom_gone', '2026-04-05', { symptom: 'legs better' }),
      ev('medicine_restarted', '2026-04-18', { medicine: 'atorvastatin' }),
      ev('symptom_started', '2026-04-20', { symptom: 'aches in my legs' }),
      ev('medicine_started', '2026-03-02', { medicine: 'ibuprofen' }),
    ], ['atorvastatin', 'metformin']);
    expect(t.map(f => [f.kind, f.entity, f.date])).toEqual([
      ['medicine_started', 'atorvastatin', '2026-03-01'],
      ['symptom_started', 'legs ache', '2026-03-14'],
      ['medicine_stopped', 'atorvastatin', '2026-03-31'],
      ['symptom_gone', 'legs ache', '2026-04-05'],
      ['medicine_restarted', 'atorvastatin', '2026-04-18'],
      ['symptom_returned', 'legs ache', '2026-04-20'],
    ]);
  });
  it('keeps two different symptoms apart', () => {
    const t = buildTimeline([ev('symptom_started', '2026-03-14', { symptom: 'legs ache' }), ev('symptom_started', '2026-03-16', { symptom: 'stomach upset' })], []);
    expect(t.map(f => f.entity)).toEqual(['legs ache', 'stomach upset']);
  });
  it('ignores a "gone" with no symptom before it', () => {
    expect(buildTimeline([ev('symptom_gone', '2026-03-14', { symptom: 'cough' })], [])).toEqual([]);
  });
});

describe('buildTimeline: a return without a recorded "gone"', () => {
  it('treats "the aches are back" as a return', () => {
    const t = buildTimeline([
      ev('symptom_started', '2026-03-14', { symptom: 'legs ache', quote: 'My legs ache so much' }),
      ev('symptom_started', '2026-04-20', { symptom: 'aches', quote: 'Oh no the aches are back in my legs since yesterday' }),
    ], []);
    expect(t.map(f => f.kind)).toEqual(['symptom_started', 'symptom_returned']);
  });
});

describe('buildTimeline: medicine labels follow a state machine', () => {
  it('turns "taking it again" after a stop into a restart and drops same-message duplicates', () => {
    const t = buildTimeline([
      ev('medicine_started', '2026-03-28', { medicine: 'ramipril', messageId: 1 }),
      ev('medicine_restarted', '2026-03-28', { medicine: 'ramipril', messageId: 1 }),
      ev('medicine_stopped', '2026-04-17', { medicine: 'ramipril' }),
      ev('medicine_started', '2026-05-02', { medicine: 'ramipril' }),
      ev('medicine_restarted', '2026-05-02', { medicine: 'ramipril' }),
    ], ['ramipril']);
    expect(t.map(f => [f.kind, f.date])).toEqual([['medicine_started', '2026-03-28'], ['medicine_stopped', '2026-04-17'], ['medicine_restarted', '2026-05-02']]);
  });
});

describe('buildTimeline: dates that need confirming', () => {
  it('flags ranges and message-only dates, not exact phrases', () => {
    const t = buildTimeline([
      ev('medicine_started', '2026-03-01', { medicine: 'atorvastatin' }),
      ev('symptom_started', '2026-03-08', { symptom: 'cough', min: '2026-03-06', max: '2026-03-10' }),
      ev('symptom_gone', '2026-03-20', { symptom: 'cough', basis: 'message' }),
    ], ['atorvastatin']);
    expect(t.map(f => f.needsConfirming)).toEqual([false, true, true]);
  });
});

describe('buildTimeline: gaps seen in run 4', () => {
  it('takes a first "ongoing" mention as the onset, so a later "gone" is kept', () => {
    const t = buildTimeline([
      ev('symptom_ongoing', '2026-02-06', { symptom: 'trouble sleeping', quote: 'had trouble sleeping for four days' }),
      ev('symptom_gone', '2026-02-20', { symptom: 'trouble sleeping' }),
      ev('symptom_ongoing', '2026-02-25', { symptom: 'sleep' }),
    ], []);
    expect(t.map(f => [f.kind, f.date])).toEqual([['symptom_started', '2026-02-06'], ['symptom_gone', '2026-02-20']]);
  });
  it('treats two everyday names for aching muscles as one symptom', () => {
    const t = buildTimeline([
      ev('symptom_started', '2026-08-09', { symptom: 'legs sore' }),
      ev('symptom_gone', '2026-08-23', { symptom: 'muscle ache' }),
    ], []);
    expect(t.map(f => [f.kind, f.entity])).toEqual([['symptom_started', 'legs sore'], ['symptom_gone', 'legs sore']]);
  });
});

describe('buildTimeline: an "ongoing" mention never invents a symptom', () => {
  it('joins "wide awake" to sleep and ignores good news labelled ongoing', () => {
    const t = buildTimeline([
      ev('symptom_started', '2026-04-14', { symptom: 'struggling to sleep' }),
      ev('symptom_ongoing', '2026-04-15', { symptom: 'Wide awake', quote: 'Wide awake.' }),
      ev('symptom_gone', '2026-05-05', { symptom: 'sleep' }),
      ev('symptom_ongoing', '2026-05-05', { symptom: 'Feeling better', quote: 'Feeling better.' }),
    ], []);
    expect(t.map(f => [f.kind, f.entity])).toEqual([['symptom_started', 'struggling to sleep'], ['symptom_gone', 'struggling to sleep']]);
  });
});

describe('buildTimeline: aching-muscle words do not swallow other reactions', () => {
  it.each([['sore throat'], ['legs swollen'], ['sore stomach']])('keeps "%s" apart from muscle ache', other => {
    const t = buildTimeline([ev('symptom_started', '2026-03-01', { symptom: 'muscle ache' }), ev('symptom_started', '2026-03-05', { symptom: other })], []);
    expect(t.map(f => f.entity)).toEqual(['muscle ache', other]);
  });
});
