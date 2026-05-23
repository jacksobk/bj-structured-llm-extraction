/**
 * LLM provider — Layer 4 (code).
 *
 * Provider-agnostic text-completion client. Resolves which backend to use:
 *   - explicit LLM_PROVIDER=anthropic|openai|mock, or
 *   - 'auto' (default): use Anthropic if its key is set, else OpenAI if its key
 *     is set, else the deterministic mock.
 *
 * The mock fallback is deliberate: a reviewer can clone and run the full
 * pipeline with zero setup and no API key, then flip on a real key to exercise
 * genuine LLM integration. Uses Node's native fetch (Node 18+), so there is no
 * SDK dependency to install or keep current.
 */

import { config } from '../../core/config';

export interface LlmResult {
  raw: string;
  provider: string;
  model: string;
}

export class LlmProvider {
  static resolveProvider(): 'anthropic' | 'openai' | 'mock' {
    const p = config.llmProvider;
    if (p === 'anthropic' || p === 'openai' || p === 'mock') return p;
    if (config.anthropicApiKey) return 'anthropic';
    if (config.openaiApiKey) return 'openai';
    return 'mock';
  }

  static async complete(system: string, user: string): Promise<LlmResult> {
    const provider = LlmProvider.resolveProvider();
    switch (provider) {
      case 'anthropic':
        return LlmProvider.callAnthropic(system, user);
      case 'openai':
        return LlmProvider.callOpenai(system, user);
      default:
        return LlmProvider.callMock(user);
    }
  }

  private static async callAnthropic(system: string, user: string): Promise<LlmResult> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 512,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      throw new Error(`anthropic_http_${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { content: { text?: string }[] };
    const raw = (data.content ?? [])
      .map((b) => b.text ?? '')
      .join('')
      .trim();
    return { raw, provider: 'anthropic', model: config.anthropicModel };
  }

  private static async callOpenai(system: string, user: string): Promise<LlmResult> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`openai_http_${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const raw = (data.choices?.[0]?.message?.content ?? '').trim();
    return { raw, provider: 'openai', model: config.openaiModel };
  }

  /**
   * Deterministic mock: keyword heuristics that return schema-shaped JSON.
   * Not intelligent — its job is to exercise the validation + verification
   * pipeline offline. Includes a deliberately low-confidence path so the
   * human-review branch is demonstrable without a real model.
   */
  private static callMock(user: string): LlmResult {
    const text = user.toLowerCase();
    // Require a $ to read an amount, so a 4-digit card number isn't misread.
    const amountMatch = user.match(/\$\s?(\d+(?:\.\d{1,2})?)/);
    const last4Match = user.match(/(?:ending|ending in|\*+|x+)\s?(\d{4})\b/i);

    let intent = 'unknown';
    let confidence = 0.55; // default low → triggers human review
    if (/(stolen|lost|fraud|did ?n[o']?t (make|recogni[sz]e|authori[sz]e)|unauthori[sz]ed|charge i did)/.test(text)) {
      intent = /card/.test(text) ? 'card_lost_or_stolen' : 'transaction_dispute';
      confidence = 0.93;
    } else if (/(balance|how much.*have|available funds)/.test(text)) {
      intent = 'balance_inquiry';
      confidence = 0.9;
    } else if (/(transfer|send|move).*(\$|\d)/.test(text)) {
      intent = 'transfer_funds';
      confidence = 0.88;
    } else if (/(loan|mortgage|apr|interest rate)/.test(text)) {
      intent = 'loan_question';
      confidence = 0.82;
    } else if (/(address|phone|email|contact)/.test(text)) {
      intent = 'update_contact_info';
      confidence = 0.8;
    }

    const result = {
      intent,
      confidence,
      entities: {
        amount: amountMatch ? Number(amountMatch[1]) : null,
        accountLast4: last4Match ? last4Match[1] : null,
        targetName: null,
        dateText: null,
      },
    };
    return { raw: JSON.stringify(result), provider: 'mock', model: 'mock-heuristic-v1' };
  }
}
