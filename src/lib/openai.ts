import type { PromptOptions } from './prompts';
import { methodology } from './prompts';

type GenerateArgs = {
  apiKey: string;
  model: string;
  request: string;
  mode: 'text' | 'image' | 'reference';
  options: PromptOptions;
  previousPrompt?: string;
  imageDataUrl?: string;
};

type ResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function extractText(payload: ResponsesPayload) {
  if (payload.output_text?.trim()) return payload.output_text.trim();
  return (payload.output || [])
    .flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text' && item.text)
    .map(item => item.text)
    .join('\n')
    .trim();
}

function apiError(status: number, message?: string) {
  if (status === 401 || status === 403) return new Error('OpenAI отклонил API‑ключ. Проверьте ключ, проект и доступ к выбранной модели.');
  if (status === 429) return new Error('Достигнут лимит OpenAI или на аккаунте нет доступной квоты. Проверьте Usage и Billing.');
  if (status === 400 || status === 404) return new Error(message || 'OpenAI не принял запрос. Проверьте название модели и параметры.');
  return new Error(message || `OpenAI вернул ошибку ${status}. Попробуйте ещё раз.`);
}

export async function generateWithOpenAI(args: GenerateArgs) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 100_000);
  const content: Array<Record<string, string>> = [{
    type: 'input_text',
    text: JSON.stringify({
      request: args.request,
      mode: args.mode,
      outputLanguage: args.options.language,
      detail: args.options.detail,
      imageFormat: args.options.format,
      visualStyle: args.options.style,
      previousPrompt: args.previousPrompt || undefined,
    }),
  }];
  if (args.imageDataUrl) content.push({ type: 'input_image', image_url: args.imageDataUrl, detail: 'high' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        instructions: methodology,
        input: [{ role: 'user', content }],
        max_output_tokens: 5000,
        store: false,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as ResponsesPayload;
    if (!response.ok) throw apiError(response.status, payload.error?.message);
    const text = extractText(payload);
    if (!text) throw new Error('OpenAI вернул ответ без текста. Попробуйте повторить запрос.');
    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('OpenAI не ответил за 100 секунд. Попробуйте ещё раз.');
    if (error instanceof TypeError) throw new Error('Не удалось обратиться к OpenAI из браузера. Проверьте интернет, блокировщики и разрешение прямых API‑запросов.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}
