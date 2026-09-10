# Forma — Prompt Studio

PWA-конструктор промптов для текста и изображений. Статическая версия публикуется в GitHub Pages через GitHub Actions, хранит историю на устройстве и работает офлайн.

## Локальный запуск

```bash
npm install
npm run dev
```

## Публикация

Каждый push в `main` запускает `.github/workflows/deploy-pages.yml`. Workflow проверяет TypeScript, создаёт статическую сборку Next.js и публикует каталог `out` в GitHub Pages.

Адрес: <https://zerom-code.github.io/prompt-pwa/>

## Ограничение GitHub Pages

GitHub Pages не выполняет серверный код. Поэтому эта версия не принимает API-ключи и использует локальный шаблонный конструктор. Для вызовов OpenAI/Anthropic и анализа фото нужен отдельный серверный API, где ключ хранится вне браузера.
