/**
 * Extraction models — Layer 2.
 *
 * - ExtractRequestDto: the validated request body (class-validator enforces it
 *   before the handler runs).
 * - ExtractedIntent: the structured contract the LLM output MUST satisfy. This
 *   is the schema the verification layer checks against — the heart of
 *   "critically evaluating AI-generated output".
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/**
 * The closed set of intents this banking extractor recognises. Anything the
 * model returns outside this set is a validation failure — the model is not
 * permitted to invent categories.
 */
export const INTENT_VALUES = [
  'balance_inquiry',
  'transaction_dispute',
  'card_lost_or_stolen',
  'transfer_funds',
  'update_contact_info',
  'loan_question',
  'general_question',
  'unknown',
] as const;

export type IntentValue = (typeof INTENT_VALUES)[number];

export interface ExtractedEntities {
  amount?: number | null;
  accountLast4?: string | null;
  targetName?: string | null;
  dateText?: string | null;
}

/**
 * The structured result. `requiresHumanReview` and `verificationNotes` are set
 * by the deterministic verifier, NOT by the model — the service decides whether
 * to trust the model, the model does not self-certify.
 */
export interface ExtractedIntent {
  intent: IntentValue;
  confidence: number; // 0..1, as claimed by the model
  entities: ExtractedEntities;
  requiresHumanReview: boolean;
  verificationNotes: string[];
}

export class ExtractRequestDto {
  @ApiProperty({
    example: 'Someone used my debit card ending 4821 for a $240 charge I didn’t make',
    description: 'Freeform customer message to extract structured intent from',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}
