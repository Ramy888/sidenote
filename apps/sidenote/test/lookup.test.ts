import { describe, it, expect } from 'vitest';
import { lookupTerm } from '../src/pipeline/lookup.ts';
import { TERMS, termName, coderTerms } from '../src/vocab/index.ts';

describe('lookup coder (on device, code)', () => {
  it.each([
    ['muscle aches', 'myalgia'], ['muscle pain', 'myalgia'], ['legs have been aching', 'myalgia'], ['dry cough', 'cough'],
    ['tickly dry cough', 'cough'], ['ankle swelling', 'edema'], ['my ankles are swollen', 'edema'], ['stomach upset', 'abdominal discomfort'],
    ['trouble sleeping', 'insomnia'], ['dry mouth', 'dry mouth'], ['pins and needles in my hands', 'paresthesia'],
  ])('codes "%s" as %s', (phrase, name) => expect(termName(lookupTerm(phrase).id)).toBe(name));
  it.each(['the car broke down again', 'see you sunday', 'pain'])('leaves "%s" uncoded', phrase => expect(lookupTerm(phrase).id).toBeNull());
  it('builds the coder term list from the shipped vocabulary', () => {
    const list = coderTerms();
    expect(list.size).toBe(TERMS.length);
    expect(list.get('SN001')).toMatch(/^myalgia \(muscle pain; /);
  });
});
