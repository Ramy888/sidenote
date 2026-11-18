import { describe, it, expect } from 'vitest';
import { locateQuote } from '../src/evidence/locate';

const msgs = [
  { id: 3, sender: 'Margaret', text: 'My legs ache so much since the weekend, like after a marathon' },
  { id: 4, sender: 'Sarah', text: 'Did you do too much gardening?' },
  { id: 5, sender: 'Margaret', text: 'Still aching. Stomach a bit off too' },
  { id: 6, sender: 'Sarah', text: 'Still aching? poor you' },
];

describe('locateQuote (Evidence Challenger core; the sender comes from where the quote is, OVE1)', () => {
  it('finds a verbatim quote and takes the sender from that message', () => {
    expect(locateQuote('legs ache so much since the weekend', msgs)).toEqual({ found: true, messageId: 3, sender: 'Margaret' });
  });
  it('ignores case, curly quotes, extra spaces and end punctuation', () => {
    expect(locateQuote('  my LEGS ache so much…  ', msgs)).toMatchObject({ found: true, messageId: 3 });
    expect(locateQuote('Did you do too much gardening', msgs)).toMatchObject({ found: true, sender: 'Sarah' });
  });
  it('rejects a quote that is not in any message, even if close', () => {
    expect(locateQuote('Legs still aching. Stomach a bit off too', msgs)).toEqual({ found: false });
  });
  it('uses the model message number only as a hint: the located message wins', () => {
    expect(locateQuote('Stomach a bit off', msgs, 3)).toMatchObject({ found: true, messageId: 5 });
  });
  it('marks a quote found in messages from two senders as ambiguous, so it is never own words', () => {
    expect(locateQuote('still aching', msgs)).toEqual({ found: true, ambiguous: true, senders: ['Margaret', 'Sarah'], messageId: 5 });
  });
  it('rejects quotes too short to prove anything', () => {
    expect(locateQuote('so', msgs)).toEqual({ found: false });
  });
});
