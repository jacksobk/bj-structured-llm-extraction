/**
 * Tests for the deterministic output verifier — the core "evaluate the AI
 * output" logic. These assert the guarantees the README claims: schema
 * enforcement, range checks, enum membership, and the human-review policy.
 */

import { OutputVerifier } from '../src/code/extract/output-verifier';

describe('OutputVerifier', () => {
  describe('parsing', () => {
    it('parses clean JSON', () => {
      const raw = JSON.stringify({
        intent: 'balance_inquiry',
        confidence: 0.9,
        entities: {},
      });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.intent).toBe('balance_inquiry');
    });

    it('tolerates code fences around the JSON', () => {
      const raw = '```json\n{"intent":"loan_question","confidence":0.82,"entities":{}}\n```';
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.intent).toBe('loan_question');
    });

    it('extracts a JSON object embedded in prose', () => {
      const raw = 'Sure! Here is the result: {"intent":"unknown","confidence":0.5,"entities":{}} hope that helps';
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
    });

    it('fails on unparseable output', () => {
      const out = OutputVerifier.verify('not json at all');
      expect(out.ok).toBe(false);
      expect(out.errors).toContain('no_json_object_found');
    });

    it('fails on empty output', () => {
      const out = OutputVerifier.verify('');
      expect(out.ok).toBe(false);
    });
  });

  describe('schema validation', () => {
    it('rejects an intent outside the allowed set', () => {
      const raw = JSON.stringify({ intent: 'make_me_a_sandwich', confidence: 0.9, entities: {} });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(false);
      expect(out.errors.join(' ')).toMatch(/intent must be one of/);
    });

    it('rejects confidence outside [0,1]', () => {
      const raw = JSON.stringify({ intent: 'balance_inquiry', confidence: 1.7, entities: {} });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(false);
      expect(out.errors.join(' ')).toMatch(/confidence must be a number/);
    });

    it('rejects a malformed accountLast4', () => {
      const raw = JSON.stringify({
        intent: 'balance_inquiry',
        confidence: 0.9,
        entities: { accountLast4: '12' },
      });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(false);
      expect(out.errors.join(' ')).toMatch(/accountLast4/);
    });
  });

  describe('human-review policy (business rules)', () => {
    it('flags low-confidence results for review', () => {
      const raw = JSON.stringify({ intent: 'balance_inquiry', confidence: 0.4, entities: {} });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.requiresHumanReview).toBe(true);
      expect(out.result?.verificationNotes.join(' ')).toMatch(/low_confidence/);
    });

    it('always flags high-stakes intents even at high confidence', () => {
      const raw = JSON.stringify({ intent: 'card_lost_or_stolen', confidence: 0.99, entities: {} });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.requiresHumanReview).toBe(true);
      expect(out.result?.verificationNotes.join(' ')).toMatch(/high_stakes_intent/);
    });

    it('does NOT flag a confident, low-stakes result', () => {
      const raw = JSON.stringify({ intent: 'balance_inquiry', confidence: 0.95, entities: {} });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.requiresHumanReview).toBe(false);
      expect(out.result?.verificationNotes).toHaveLength(0);
    });

    it('notes a transfer with no amount as a cross-field concern', () => {
      const raw = JSON.stringify({ intent: 'transfer_funds', confidence: 0.9, entities: { amount: null } });
      const out = OutputVerifier.verify(raw);
      expect(out.ok).toBe(true);
      expect(out.result?.verificationNotes.join(' ')).toMatch(/transfer_without_amount/);
    });
  });
});
