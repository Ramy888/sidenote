import { describe, it, expect } from 'vitest';
import { NOT_AN_EVENT, SYMPTOM_WORDS, cueMatcher, sentenceAround, isGeneralClaim, reportsRecovery } from '../src/pipeline/lexicon';

describe('event filters', () => {
  it('finds the sentence around a quote, so a question is recognised', () => {
    expect(sentenceAround('Hi Dad. Just checking in, how is your trouble sleeping? Love you', 'how is your trouble sleeping').endsWith('?')).toBe(true);
    expect(sentenceAround('My legs ache. How are you?', 'My legs ache').endsWith('?')).toBe(false);
  });
  it('flags general claims but not real events', () => {
    expect(NOT_AN_EVENT.test('I read online that atorvastatin can cause muscle aches in general')).toBe(true);
    expect(NOT_AN_EVENT.test('My legs have been feeling very sore since Sunday')).toBe(false);
  });
  it('cues and accepts a symptom whose words are split ("mouth ... dry")', () => {
    const msg = { text: 'my mouth is so dry since Tuesday, ugh' };
    expect(cueMatcher([])(msg)).toBe(true);
    expect(SYMPTOM_WORDS.test(msg.text)).toBe(true);
  });
  it('judges a quote with no symptom by its whole message (a claim quoted half-way)', () => {
    const msg = 'Saw online that sertraline can cause insomnia. Apparently it is a known side effect.';
    expect(isGeneralClaim(sentenceAround(msg, 'Apparently it is a known side effect.'), msg, 'symptom_started')).toBe(true);
    const own = 'Dry mouth is back since Friday. Read that it can cause it';
    expect(isGeneralClaim(sentenceAround(own, 'Dry mouth is back since Friday'), own, 'symptom_started')).toBe(false);
  });
  it('reads a good-news sentence as the symptom ending, not starting', () => {
    expect(reportsRecovery('been sleeping well since Friday, finally')).toBe(true);
    expect(reportsRecovery('legs are back to normal')).toBe(true);
    expect(reportsRecovery('the cough went away')).toBe(true);
    expect(reportsRecovery('the trouble sleeping is back since Monday')).toBe(false);
    expect(reportsRecovery('my legs ache again')).toBe(false);
  });
});

describe('general claims never hide a medicine event', () => {
  it('keeps "Stopped the ramipril today" even when the message also repeats a claim', () => {
    const msg = 'Stopped the ramipril today. Read online it can cause this cough.';
    expect(isGeneralClaim(sentenceAround(msg, 'Stopped the ramipril today'), msg, 'medicine_stopped')).toBe(false);
    const claim = 'Saw online that sertraline can cause insomnia. Apparently it is a known side effect.';
    expect(isGeneralClaim(sentenceAround(claim, 'Apparently it is a known side effect.'), claim, 'symptom_started')).toBe(true);
  });
});
