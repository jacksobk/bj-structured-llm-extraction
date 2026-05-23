/**
 * Output verifier — Layer 4 (code). THE CENTERPIECE.
 *
 * Takes the model's raw text and decides whether the structured result can be
 * trusted. This is deliberately DETERMINISTIC — no LLM is involved in checking
 * the LLM. In a regulated/banking context you cannot have a stochastic checker
 * validating a stochastic producer; the verification path must be reproducible
 * and auditable.
 *
 * Three stages:
 *   1. parse     — pull JSON out of the raw text (tolerates fences/preamble)
 *   2. validate  — enforce the schema (types, enum membership, ranges)
 *   3. verify    — apply business rules and decide requiresHumanReview
 *
 * Returns either a validation failure (with concrete errors, which the retry
 * path feeds back to the model) or a verified ExtractedIntent.
 */

import {
  ExtractedIntent,
  IntentValue,
  INTENT_VALUES,
} from '../../models/extract';
import { config } from '../../core/config';

export interface VerifyOutcome {
  ok: boolean;
  errors: string[];
  result?: ExtractedIntent;
}

export class OutputVerifier {
  /** Stage 1: tolerant JSON extraction. */
  private static parse(raw: string): { value?: unknown; error?: string } {
    if (!raw) return { error: 'empty_model_output' };
    let candidate = raw.trim();

    // Strip code fences if the model wrapped its JSON.
    const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) candidate = fence[1].trim();

    // Otherwise grab the outermost {...}.
    if (!candidate.startsWith('{')) {
      const first = candidate.indexOf('{');
      const last = candidate.lastIndexOf('}');
      if (first === -1 || last === -1 || last <= first) {
        return { error: 'no_json_object_found' };
      }
      candidate = candidate.slice(first, last + 1);
    }

    try {
      return { value: JSON.parse(candidate) };
    } catch {
      return { error: 'invalid_json' };
    }
  }

  /** Stages 2 + 3. */
  static verify(raw: string): VerifyOutcome {
    const parsed = OutputVerifier.parse(raw);
    if (parsed.error) {
      return { ok: false, errors: [parsed.error] };
    }

    const errors: string[] = [];
    const obj = (parsed.value ?? {}) as Record<string, unknown>;

    // --- Stage 2: schema validation ---
    const intent = obj.intent;
    if (typeof intent !== 'string' || !INTENT_VALUES.includes(intent as IntentValue)) {
      errors.push(
        `intent must be one of ${JSON.stringify(INTENT_VALUES)} (got ${JSON.stringify(intent)})`,
      );
    }

    const confidence = obj.confidence;
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 1 || Number.isNaN(confidence)) {
      errors.push(`confidence must be a number in [0,1] (got ${JSON.stringify(confidence)})`);
    }

    const entities = (obj.entities ?? {}) as Record<string, unknown>;
    if (typeof obj.entities !== 'object' || obj.entities === null) {
      errors.push('entities must be an object');
    }

    const amount = entities.amount;
    if (amount !== null && amount !== undefined && typeof amount !== 'number') {
      errors.push('entities.amount must be a number or null');
    }
    const accountLast4 = entities.accountLast4;
    if (
      accountLast4 !== null &&
      accountLast4 !== undefined &&
      !(typeof accountLast4 === 'string' && /^\d{4}$/.test(accountLast4))
    ) {
      errors.push('entities.accountLast4 must be 4 digits or null');
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    // --- Stage 3: business-rule verification → requiresHumanReview ---
    const verificationNotes: string[] = [];
    let requiresHumanReview = false;

    const conf = confidence as number;
    if (conf <= config.reviewConfidenceThreshold) {
      requiresHumanReview = true;
      verificationNotes.push(`low_confidence(${conf}<=${config.reviewConfidenceThreshold})`);
    }

    if (intent === 'unknown') {
      requiresHumanReview = true;
      verificationNotes.push('unknown_intent');
    }

    // High-stakes intents always get a human in the loop regardless of
    // confidence — a deliberate policy, not a model decision.
    const highStakes: IntentValue[] = [
      'card_lost_or_stolen',
      'transaction_dispute',
      'transfer_funds',
    ];
    if (highStakes.includes(intent as IntentValue)) {
      requiresHumanReview = true;
      verificationNotes.push(`high_stakes_intent(${intent})`);
    }

    // Cross-field sanity: a transfer with no amount is suspicious.
    if (intent === 'transfer_funds' && (amount === null || amount === undefined)) {
      verificationNotes.push('transfer_without_amount');
    }

    const result: ExtractedIntent = {
      intent: intent as IntentValue,
      confidence: conf,
      entities: {
        amount: (amount as number) ?? null,
        accountLast4: (accountLast4 as string) ?? null,
        targetName: (entities.targetName as string) ?? null,
        dateText: (entities.dateText as string) ?? null,
      },
      requiresHumanReview,
      verificationNotes,
    };

    return { ok: true, errors: [], result };
  }
}
