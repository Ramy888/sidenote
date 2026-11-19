import { describe, it, expect } from 'vitest';
import { SUPPORTED, medicineProblems, blankMedicine } from '../src/app/medicines.ts';

describe('medicines', () => {
  it('suggests the vocabulary medicines, including vitamin D', () => {
    expect(SUPPORTED).toEqual(expect.arrayContaining(['atorvastatin', 'ramipril', 'vitamin D']));
  });
  it('needs a name, and a date or month only when the start kind asks for one', () => {
    const today = '2026-11-19';
    expect(medicineProblems(blankMedicine(), today)).toEqual(['medNameNeeded']);
    expect(medicineProblems({ ...blankMedicine(), name: 'ramipril', startKind: 'exact' }, today)).toEqual(['medDateNeeded']);
    expect(medicineProblems({ ...blankMedicine(), name: 'ramipril', startKind: 'exact', start: '2026-12-01' }, today)).toEqual(['medDateFuture']);
    expect(medicineProblems({ ...blankMedicine(), name: 'ramipril', startKind: 'month', start: '2026-10' }, today)).toEqual([]);
    expect(medicineProblems({ ...blankMedicine(), name: 'ramipril', startKind: 'unknown' }, today)).toEqual([]);
  });
});
