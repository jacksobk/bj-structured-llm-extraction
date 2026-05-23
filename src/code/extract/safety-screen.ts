/**
 * Safety screen — Layer 4 (code).
 *
 * A dedicated, deterministic input-safety layer that runs BEFORE any text is
 * sent to the model. This is intentionally a separate, documented module: in an
 * applied-AI role, demonstrating that you defend against adversarial input is
 * as important as the happy path.
 *
 * It screens for the most common prompt-injection patterns — attempts to
 * override the system instructions, leak the prompt, or change the model's role.
 * It does NOT use an LLM to make this decision (that would be circular); the
 * checks are deterministic and auditable.
 *
 * This is a screen, not a guarantee. It raises the cost of trivial injection
 * and documents intent; defence in depth (constrained output schema,
 * deterministic verification) does the rest.
 */

export interface SafetyResult {
  allowed: boolean;
  reasons: string[];
}

const INJECTION_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: 'override_instructions', pattern: /ignore (all |the |your |previous |above )?(instructions|prompt|rules)/i },
  { label: 'reveal_prompt', pattern: /(reveal|show|print|repeat|expose).{0,20}(system )?(prompt|instructions)/i },
  { label: 'role_reassignment', pattern: /you are (now|actually) (a|an|the)\b/i },
  { label: 'developer_mode', pattern: /(developer|debug|jailbreak|dan) mode/i },
  { label: 'instruction_delimiter', pattern: /(<\|.*?\|>|\[\/?(system|inst|assistant)\])/i },
  { label: 'disregard_safety', pattern: /(disregard|bypass|forget).{0,20}(safety|guardrails|policy)/i },
];

export class SafetyScreen {
  static screen(text: string, maxChars: number): SafetyResult {
    const reasons: string[] = [];

    const trimmed = (text ?? '').trim();
    if (!trimmed) {
      return { allowed: false, reasons: ['empty_input'] };
    }
    if (trimmed.length > maxChars) {
      reasons.push(`exceeds_max_length(${maxChars})`);
    }

    for (const { label, pattern } of INJECTION_PATTERNS) {
      if (pattern.test(trimmed)) {
        reasons.push(`injection_pattern:${label}`);
      }
    }

    // A high ratio of non-natural-language characters is a weak signal of an
    // encoded-payload attempt; flag rather than hard-block.
    const symbolRatio =
      (trimmed.replace(/[a-z0-9\s.,!?'"$%-]/gi, '').length || 0) / trimmed.length;
    if (symbolRatio > 0.3) {
      reasons.push('high_symbol_ratio');
    }

    // Hard-block only on explicit injection attempts or empty/oversized input.
    const hardBlock = reasons.some(
      (r) => r.startsWith('injection_pattern:') || r.startsWith('exceeds_max_length'),
    );

    return { allowed: !hardBlock, reasons };
  }
}
