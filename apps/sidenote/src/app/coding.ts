// Coding confirmed symptoms to vocabulary terms: the on-device lookup first (on the symptom's name, then on
// each quote, all on this device); the model coder only for a phrase in the patient's or reporter's own words,
// after approval; anything else stays uncoded (other people's words are never sent).
import { lookupTerm } from '../pipeline/lookup.ts';
import type { Reviewed } from './review.ts';

export interface CodingStep { entity: string; how: 'lookup' | 'model' | 'uncoded'; term?: string; phrase?: string; message?: { sender: string; text: string } }

export function planCoding(confirmed: Reviewed[]): CodingStep[] {
  const symptoms = confirmed.filter(f => f.kind.startsWith('symptom') && f.status === 'confirmed');
  return [...new Set(symptoms.map(f => f.entity))].map(entity => {
    const facts = symptoms.filter(f => f.entity === entity);
    for (const text of [entity, ...facts.map(f => f.evidence.quote)]) {
      const id = text && lookupTerm(text).id;
      if (id) return { entity, how: 'lookup', term: id };
    }
    const own = facts.find(f => f.evidence.own && f.evidence.quote.toLowerCase().includes(entity.toLowerCase()) && entity.split(/\s+/).length <= 8);
    return own ? { entity, how: 'model', phrase: entity, message: { sender: own.evidence.sender, text: own.evidence.quote } } : { entity, how: 'uncoded' };
  });
}
