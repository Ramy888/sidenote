import { describe, it, expect } from 'vitest';
import { redFlags, urgentHelp, isAdviceBait, NEVER_ADVISE, URGENT } from '../src/pipeline/safety';

describe('red flags (English)', () => {
  it.each([
    'her lips are swollen and she feels funny',
    'swelling in his throat after the new tablet',
    "I can't breathe properly",
    'having trouble breathing since lunch',
    'tongue feels huge and puffy',
    'chest pain on and off',
    'Mum fainted in the kitchen',
    'been having thoughts of killing myself',
  ])('flags "%s"', t => expect(redFlags(t).length).toBeGreaterThan(0));
  it.each(['my ankles are a bit swollen', 'legs aching since Saturday', 'dry cough again', 'can you pick up bread'])
    ('does not flag "%s"', t => expect(redFlags(t)).toEqual([]));
});

describe('red flags (Arabic)', () => {
  it.each(['عندي تورم في الوجه', 'الشفايف وارمة', 'ضيق في التنفس من امبارح', 'مش قادر أتنفس', 'مش قادرة اتنفس كويس', 'وجع في صدري', 'أغمى عليها الصبح'])
    ('flags "%s"', t => expect(redFlags(t).length).toBeGreaterThan(0));
  it.each(['رجلي بتوجعني', 'كحة ناشفة', 'هات عيش وانت جاي'])('does not flag "%s"', t => expect(redFlags(t)).toEqual([]));
});

describe('urgent help screen', () => {
  it('gives the region number and fixed copy, also for a weeks-old chat message', () => {
    const u = urgentHelp([{ text: 'Dad: my lips swelled up after the pill', at: '2026-01-02T10:00:00' }], 'EG');
    expect(u).toMatchObject({ show: true, phone: '123' });
    expect(urgentHelp([{ text: 'trouble breathing' }], 'US').phone).toBe('911');
    expect(urgentHelp([{ text: 'trouble breathing' }], 'UK').phone).toBe('999 or 111');
    expect(urgentHelp([{ text: 'legs ache' }], 'US').show).toBe(false);
    expect(URGENT.en).toBe('Some of what you described can be serious. Get urgent medical help now.');
  });
});

describe('advice bait: answered by a fixed template, never by the model', () => {
  it.each(['should I stop the atorvastatin?', 'Is it safe to take it again', 'did the ramipril cause my cough?', 'can I restart it tomorrow?',
    'أوقف الدوا ولا لا؟', 'هل الدوا ده السبب في الكحة؟', 'ينفع أرجع آخده تاني؟'])('"%s" is bait', t => expect(isAdviceBait(t)).toBe(true));
  it.each(['I stopped the atorvastatin on Monday', 'I read online that amlodipine can cause ankle swelling in general.', 'وقفت الدوا من يومين'])('"%s" is a report, not bait', t => expect(isAdviceBait(t)).toBe(false));
  it('the templates never tell anyone to stop, start or change a medicine', () => {
    for (const s of [NEVER_ADVISE.en, URGENT.en]) expect(s).not.toMatch(/\byou should (stop|start|take|keep)\b|\b(stop|keep) taking\b/i);
    expect(NEVER_ADVISE.en).toMatch(/doctor or pharmacist/);
    expect(NEVER_ADVISE.ar).toMatch(/الطبيب|طبيبك/);
  });
});
