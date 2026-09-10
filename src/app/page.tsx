'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Sparkles, Plus, MessageSquare, Image as ImageIcon, ScanLine, History, Star, Settings2, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown, PanelLeftClose, PanelLeft, BookOpen, Smartphone, X, SlidersHorizontal, Globe2, Check, Copy, Download, RefreshCw, Trash2, Search, WandSparkles, ShieldCheck, Info, LoaderCircle, Upload, MoreHorizontal, Feather, Command, Layers3, Zap, Share2, Server } from 'lucide-react';
import { demoPrompt } from '@/lib/prompts';

type Mode = 'text' | 'image' | 'reference';
type View = 'studio' | 'history' | 'favorites';
type Options = { language: string; detail: string; format: string; style: string };
type Entry = { id: string; title: string; input: string; output: string; mode: Mode; model: string; options: Options; favorite: boolean; demo: boolean; createdAt: string };
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const initialOptions = { language: 'English', detail: 'Подробно', format: '1:1', style: 'Фотореализм' };
const templates = [
  { title: 'Мир, которого ещё нет', category: 'Креатив и воображение', image: `${basePath}/images/mountains.svg`, mode: 'image' as Mode, style: 'Кинематографичный', input: 'Создай сюрреалистичный горный пейзаж: розовые облака окутывают вершины, мягкий рассветный свет, ощущение тишины и другого мира.' },
  { title: 'Продукт в главной роли', category: 'Предметная съёмка', image: `${basePath}/images/product.svg`, mode: 'image' as Mode, style: 'Минимализм', input: 'Рекламная фотография флакона парфюма на светлом каменном подиуме. Тёплый солнечный свет, мягкие тени, бежевые оттенки, эстетика премиального бренда.' },
  { title: 'Портрет с характером', category: 'Портретная фотография', image: `${basePath}/images/portrait.svg`, mode: 'image' as Mode, style: 'Кинематографичный', input: 'Создай кинематографичный мужской портрет: выразительный боковой свет, тёмный фон, естественная текстура кожи, спокойный уверенный взгляд, журнальная фотосессия.' },
];
const quickIdeas = [
  { label: 'Написать текст', icon: Feather, input: 'Напиши вовлекающий пост для соцсетей о запуске моего нового продукта. Помоги определить структуру, сильное начало и ненавязчивый призыв к действию.' },
  { label: 'Придумать идею', icon: Sparkles, input: 'Придумай 10 необычных идей для небольшого онлайн-бизнеса. Сравни их по сложности запуска, необходимым ресурсам и способам найти первых клиентов.' },
  { label: 'Решить задачу', icon: Command, input: 'Помоги составить реалистичный план изучения английского языка за 3 месяца. Я начинающий и могу заниматься по 30 минут в день.' },
];

function Modal({ title, children, close, wide = false }: { title: string; children: ReactNode; close: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={close} onClick={e => { if (e.target === ref.current) close(); }}><div className="modal-inner"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" onClick={close} aria-label="Закрыть"><X size={21} /></button></div>{children}</div></dialog>;
}

function SettingsModal({ close }: { close: () => void }) {
  return <Modal title="Подключение ИИ" close={close}><p className="modal-description">Версия на GitHub Pages работает как локальный конструктор промптов и не принимает секретные ключи.</p>
    <div className="privacy-note"><ShieldCheck size={20} /><p>OpenAI и Anthropic требуют хранить обычные API‑ключи на сервере. GitHub Pages публикует только статические файлы, поэтому ключ нельзя безопасно добавить сюда или сохранить в GitHub Secrets для клиентской сборки.</p></div>
    <div className="info-box"><Server size={18} /><p>Для глубокой генерации и анализа изображений понадобится небольшой отдельный API‑сервер. Интерфейс уже подготовлен к такому расширению; локальная история продолжит работать на устройстве.</p></div>
    <button className="primary full" type="button" onClick={close}>Понятно <Check size={17} /></button>
  </Modal>;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>('text');
  const [view, setView] = useState<View>('studio');
  const [input, setInput] = useState('');
  const [options, setOptions] = useState<Options>(initialOptions);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [current, setCurrent] = useState<Entry | null>(null);
  const [modal, setModal] = useState<'settings' | 'knowledge' | 'install' | 'templates' | null>(null);
  const [menu, setMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [image, setImage] = useState('');
  const [imageName, setImageName] = useState('');
  const [refining, setRefining] = useState(false);
  const [offline, setOffline] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ready = (event: MessageEvent) => { if (event.data?.type === 'FORMA_OFFLINE_READY') { try { localStorage.setItem('forma_offline_ready', '1'); } catch {} } };
    try {
      setInput(localStorage.getItem('forma_draft') || '');
      const history = localStorage.getItem('forma_history');
      if (history) setEntries(JSON.parse(history));
    } catch { /* Storage may be unavailable in private browsing. */ }
    setHistoryLoading(false);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', ready);
      navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).then(async registration => {
        await navigator.serviceWorker.ready;
        const urls = performance.getEntriesByType('resource').map(entry => entry.name).filter(url => url.startsWith(location.origin));
        registration.active?.postMessage({ type: 'CACHE_URLS', urls });
      }).catch(() => {});
    }
    const update = () => setOffline(!navigator.onLine);
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); navigator.serviceWorker?.removeEventListener('message', ready); };
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !loading && !modal) {
        event.preventDefault(); setView('studio'); setCurrent(null); setInput(''); setRefining(false); setImage(''); setImageName(''); setError(''); setMenu(false);
        try { localStorage.removeItem('forma_draft'); } catch {}
        setTimeout(() => textarea.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, [loading, modal]);
  function updateInput(value: string) { setInput(value); try { localStorage.setItem('forma_draft', value); } catch {} }
  function storeEntries(next: Entry[]) { setEntries(next); try { localStorage.setItem('forma_history', JSON.stringify(next)); } catch {} }
  function newPrompt(nextMode: Mode = mode) { if (loading) return; setMode(nextMode); setView('studio'); updateInput(''); setCurrent(null); setImage(''); setImageName(''); setRefining(false); setError(''); setMenu(false); setTimeout(() => textarea.current?.focus(), 50); }
  function navigate(next: View) { setView(next); setMenu(false); setError(''); }
  function openEntry(entry: Entry) { if (loading) return; setCurrent(entry); setMode(entry.mode); setOptions(entry.options); updateInput(entry.input); setImage(''); setImageName(''); setRefining(false); setView('studio'); setMenu(false); setError(''); }
  function useTemplate(t: typeof templates[number]) { newPrompt(t.mode); updateInput(t.input); setOptions(o => ({ ...o, style: t.style, format: t.title.includes('Портрет') ? '4:5' : '16:9' })); setModal(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function generate() {
    if (loading) return;
    if (!input.trim()) { setError('Опишите вашу идею — хотя бы в нескольких словах.'); textarea.current?.focus(); return; }
    if (mode === 'reference') { setError(image ? 'Анализ изображения требует отдельного безопасного API‑сервера. GitHub Pages не может выполнить его самостоятельно.' : 'Сначала загрузите фото-референс.'); return; }
    setLoading(true); setError('');
    try {
      const data: Entry = { id: crypto.randomUUID(), title: input.trim().slice(0, 80), input: input.trim(), output: demoPrompt(input.trim(), mode, options, refining ? current?.output : undefined), mode, model: 'Локальный шаблон', options: { ...options }, favorite: false, demo: true, createdAt: new Date().toISOString() };
      setCurrent(data); storeEntries([data, ...entries]); setRefining(false); setToast('Промпт готов и сохранён в истории');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка соединения. Попробуйте ещё раз.'); }
    finally { setLoading(false); }
  }
  function favorite(entry: Entry) {
    storeEntries(entries.map(e => e.id === entry.id ? { ...e, favorite: !e.favorite } : e)); if (current?.id === entry.id) setCurrent({ ...entry, favorite: !entry.favorite }); setToast(entry.favorite ? 'Удалено из избранного' : 'Добавлено в избранное');
  }
  function remove(entry: Entry) {
    if (!window.confirm('Удалить этот промпт из истории?')) return;
    storeEntries(entries.filter(e => e.id !== entry.id)); if (current?.id === entry.id) setCurrent(null); setToast('Промпт удалён');
  }
  async function copy() { if (!current) return; try { await navigator.clipboard.writeText(current.output); setToast('Промпт скопирован'); } catch { setToast('Копирование недоступно. Выделите текст вручную.'); } }
  function download() { if (!current) return; const url = URL.createObjectURL(new Blob([current.output], { type: 'text/plain;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = `forma-${current.id.slice(0, 8)}.txt`; a.click(); URL.revokeObjectURL(url); }
  function loadFile(file?: File) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Выберите JPG, PNG или WebP размером до 5 МБ. HEIC можно экспортировать в JPEG.'); return; }
    const reader = new FileReader(); reader.onload = () => { setImage(reader.result as string); setImageName(file.name); setError(''); if (!input.trim()) updateInput('Проанализируй референс и создай промпт для похожей фотосессии. В генератор я загружу свою фотографию лица: сохрани мою внешность, а из референса возьми композицию, позу, свет и атмосферу.'); }; reader.onerror = () => setError('Не удалось прочитать файл.'); reader.readAsDataURL(file);
  }
  const filtered = entries.filter(e => (view !== 'favorites' || e.favorite) && `${e.title} ${e.output}`.toLowerCase().includes(query.toLowerCase()));
  const modeTitle = mode === 'text' ? 'Текстовый промпт' : mode === 'image' ? 'Промпт для изображения' : 'Промпт по референсу';

  return <div className="app-shell">
    {menu && <div className="sidebar-backdrop" onClick={() => setMenu(false)} />}
    <aside className={`sidebar ${menu ? 'is-open' : ''}`}>
      <a className="brand" href={`${basePath}/`} aria-label="Forma — главная"><span className="brand-mark"><Sparkles size={23} fill="currentColor" /></span><span>forma<span className="brand-dot">.</span></span><span className="brand-caption">PROMPT STUDIO</span></a>
      <button className="new-prompt" onClick={() => newPrompt()} disabled={loading}><Plus size={19} /> Новый промпт <span>⌘ K</span></button>
      <div className="nav-caption">ВАШЕ ПРОСТРАНСТВО</div>
      <nav className="main-nav" aria-label="Основная навигация">
        <button className={view === 'studio' && mode === 'text' ? 'active' : ''} onClick={() => newPrompt('text')} disabled={loading}><MessageSquare size={18} />Текстовые промпты{view === 'studio' && mode === 'text' && <span className="active-dot" />}</button>
        <button className={view === 'studio' && mode !== 'text' ? 'active' : ''} onClick={() => newPrompt('image')} disabled={loading}><ImageIcon size={18} />Студия изображений</button>
        <button className={view === 'favorites' ? 'active' : ''} onClick={() => navigate('favorites')}><Star size={18} />Избранное{entries.filter(e => e.favorite).length > 0 && <span className="nav-count">{entries.filter(e => e.favorite).length}</span>}</button>
        <button className={view === 'history' ? 'active' : ''} onClick={() => navigate('history')}><History size={18} />История промптов</button>
      </nav>
      <div className="sidebar-history"><div className="nav-caption">НЕДАВНИЕ <button aria-label="Открыть всю историю" onClick={() => navigate('history')}><MoreHorizontal size={17} /></button></div>{entries.length ? entries.slice(0, 5).map(e => <button key={e.id} className={`recent-item ${current?.id === e.id && view === 'studio' ? 'selected' : ''}`} onClick={() => openEntry(e)} disabled={loading}>{e.mode === 'text' ? <MessageSquare size={15} /> : <ImageIcon size={15} />}<span>{e.title}</span></button>) : <div className="empty-recent"><div className="small-history-icon"><History size={18} /></div><p>{historyLoading ? 'Загружаем историю…' : 'Здесь будет история ваших идей'}</p><span>Создайте свой первый промпт</span></div>}</div>
      <div className="sidebar-bottom"><button className="knowledge-card" onClick={() => setModal('knowledge')}><span className="knowledge-icon"><BookOpen size={19} /></span><span><strong>Хороший промпт — не магия</strong><small>Узнайте, как работает Forma</small></span><ArrowUpRight size={15} /></button><button className="bottom-nav" onClick={() => setModal('settings')}><Settings2 size={18} />Подключение ИИ<span><ChevronRight size={15} /></span></button><button className="bottom-nav" onClick={() => setModal('install')}><Smartphone size={18} />Установить приложение<ArrowUpRight size={15} /></button><div className="profile"><span className="avatar">Я</span><div><strong>Личное пространство</strong><small><span className="tiny-dot" />История на устройстве</small></div><button className="icon-button" aria-label="О подключении ИИ" onClick={() => setModal('settings')}><ChevronDown size={15} /></button></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button menu-toggle" aria-label="Открыть меню" onClick={() => setMenu(!menu)}><PanelLeft size={19} /></button><span className="desktop-panel"><PanelLeftClose size={17} /></span><span className="breadcrumb-home">Рабочее пространство</span><ChevronRight size={13} /><strong>{view === 'history' ? 'История' : view === 'favorites' ? 'Избранное' : 'Новый промпт'}</strong></div><div className="topbar-actions"><span className="status-pill"><span />{offline ? 'Офлайн' : 'Локальный режим'}</span><button className="api-button" onClick={() => setModal('settings')}><Server size={15} /><span>Подключение ИИ</span><ChevronRight size={14} /></button></div></header>
      <main className="workspace">
        {view === 'studio' ? <>
          <section className="hero"><div className="eyebrow"><span /> МЕНЬШЕ УСИЛИЙ. БОЛЬШЕ ВОЗМОЖНОСТЕЙ.</div><h1>Ваша идея. <span>Идеальный промпт.</span></h1><p>Опишите задачу своими словами — Forma превратит её<br className="desktop-break" /> в точный и продуманный запрос для ИИ.</p><div className="hero-art" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><Sparkles className="large-sparkle" size={81} strokeWidth={1.1} /><Sparkles className="small-sparkle" size={27} strokeWidth={1.4} /><span className="art-dot a" /><span className="art-dot b" /><span className="art-cross">+</span></div></section>
          <div className="studio-tabs" role="tablist" aria-label="Тип промпта">{([{ id: 'text', label: 'Текстовый промпт', icon: MessageSquare }, { id: 'image', label: 'Для изображения', icon: ImageIcon }, { id: 'reference', label: 'По референсу', icon: ScanLine }] as const).map(tab => <button role="tab" aria-selected={mode === tab.id} key={tab.id} className={mode === tab.id ? 'selected' : ''} onClick={() => newPrompt(tab.id)} disabled={loading}><tab.icon size={18} /><span>{tab.label}</span>{tab.id === 'reference' && <span className="new-badge">NEW</span>}</button>)}</div>
          <div className="composer-grid">
            <section className="composer-card"><div className="card-heading"><div className="heading-icon"><WandSparkles size={18} /></div><h2>{refining ? 'Что улучшим?' : mode === 'reference' ? 'Вдохновитесь референсом' : 'Начните с простой идеи'}</h2><span className="step-badge">01</span></div><p className="card-description">{refining ? 'Добавьте уточнения — мы доработаем предыдущий промпт.' : mode === 'text' ? 'Не думайте о формулировках. Просто расскажите, что вам нужно.' : mode === 'image' ? 'Опишите картинку, которую представляете. Мы добавим детали.' : 'Загрузите фото. Мы разберём свет, композицию и атмосферу.'}</p>
              {mode === 'reference' && <div className={`upload-zone ${image ? 'has-image' : ''}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); }}>{image ? <><img src={image} alt="Загруженный референс" /><div><strong>{imageName}</strong><span>Фото не сохраняется в истории</span><button onClick={() => fileRef.current?.click()}>Заменить фото</button></div><button className="icon-button" aria-label="Удалить фото" onClick={() => { setImage(''); setImageName(''); }}><X size={17} /></button></> : <button onClick={() => fileRef.current?.click()}><Upload size={25} /><strong>Выберите фото или перетащите сюда</strong><span>JPG, PNG, WebP · до 5 МБ</span></button>}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e => { loadFile(e.target.files?.[0]); e.target.value = ''; }} /></div>}
              <div className="textarea-wrap"><textarea ref={textarea} aria-label="Ваша идея" value={input} maxLength={6000} onChange={e => updateInput(e.target.value)} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); void generate(); } }} placeholder={mode === 'text' ? 'Например: хочу написать пост о своём продукте,\nчтобы он был живым и цеплял с первых строк…' : mode === 'image' ? 'Например: уютный домик у озера на рассвете,\nлёгкий туман и тёплый свет в окнах…' : 'Что особенно нравится в этом фото?\nКакие детали вы хотите сохранить?'} disabled={loading} /><div className="textarea-footer"><span><Globe2 size={13} /> Пишите на любом языке</span><span>{input.length.toLocaleString('ru-RU')} / 6 000</span></div></div>
              <div className="quick-ideas"><span>Попробуйте:</span>{quickIdeas.map(idea => <button key={idea.label} disabled={loading} onClick={() => { newPrompt('text'); updateInput(idea.input); }}><idea.icon size={12} />{idea.label}</button>)}</div>
              {error && <div className="error-message" role="alert"><Info size={17} /><span>{error}</span><button aria-label="Скрыть ошибку" onClick={() => setError('')}><X size={15} /></button></div>}
              <div className="generate-row"><span className="keyboard-hint">⌘ <span>↵</span> <small>для генерации</small></span><button className="primary generate-button" onClick={() => void generate()} disabled={loading}>{loading ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}{loading ? 'Создаём ваш промпт…' : refining ? 'Доработать промпт' : 'Создать промпт'}{!loading && <ArrowRight size={18} />}</button></div>
            </section>
            <aside className="parameters-card"><div className="card-heading"><SlidersHorizontal size={18} /><h2>Тонкая настройка</h2><span className="step-badge">02</span></div><div className="parameter-field"><label htmlFor="language"><Globe2 size={14} />Язык промпта</label><div className="select-wrap"><select id="language" value={options.language} onChange={e => setOptions({ ...options, language: e.target.value })}><option>English</option><option>Русский</option></select><ChevronDown size={14} /></div><span className="field-hint">Английский — универсальный выбор для ИИ</span></div>
              <div className="parameter-field"><label><Layers3 size={14} />Детализация</label><div className="segmented">{['Кратко', 'Подробно', 'Максимально'].map(d => <button key={d} className={options.detail === d ? 'selected' : ''} onClick={() => setOptions({ ...options, detail: d })}>{d}</button>)}</div></div>
              {mode !== 'text' && <><div className="parameter-field"><label htmlFor="format">Формат изображения</label><div className="ratio-options">{['1:1', '4:5', '9:16', '16:9', '3:2'].map(f => <button key={f} className={options.format === f ? 'selected' : ''} onClick={() => setOptions({ ...options, format: f })}><span style={{ aspectRatio: f.replace(':', '/'), height: f === '16:9' || f === '3:2' ? 13 : 19 }} />{f}</button>)}</div></div><div className="parameter-field"><label htmlFor="style">Визуальный стиль</label><div className="select-wrap"><select id="style" value={options.style} onChange={e => setOptions({ ...options, style: e.target.value })}>{['Фотореализм', 'Кинематографичный', '3D-рендер', 'Иллюстрация', 'Аниме', 'Минимализм'].map(s => <option key={s}>{s}</option>)}</select><ChevronDown size={14} /></div></div></>}
              <div className="parameter-divider" /><div className="model-label">РЕЖИМ ГЕНЕРАЦИИ</div><button className="model-select" onClick={() => setModal('settings')}><span className="model-icon"><Command size={22} /></span><span><strong>Локальный шаблон</strong><small>GitHub Pages</small></span><ChevronDown size={15} /></button><div className="model-note"><span className="purple-dot" />Работает локально и без API‑ключа</div>
            </aside>
          </div>
          {!current && <div className="methodology-strip"><span className="method-icon"><ShieldCheck size={19} /></span><p>Не просто перевод. <strong>Промпт, построенный по лучшим практикам.</strong><span>Роль, контекст, чёткие инструкции и нужный формат ответа.</span></p><div className="method-brands"><span><Command size={17} />OpenAI</span><span><Sparkles size={17} />Claude</span><button className="icon-button" onClick={() => setModal('knowledge')} aria-label="О методике"><Info size={16} /></button></div></div>}
          {current && <section className="result-card" ref={resultRef}><div className="result-heading"><div><span className="result-label"><Sparkles size={15} />ШАБЛОННЫЙ РЕЗУЛЬТАТ</span><h2>Идея обрела форму.</h2></div><div className="result-actions"><button className={`icon-button ${current.favorite ? 'is-favorite' : ''}`} onClick={() => favorite(current)} aria-label="В избранное"><Star size={19} fill={current.favorite ? 'currentColor' : 'none'} /></button><button className="icon-button" onClick={download} aria-label="Скачать промпт"><Download size={19} /></button><button className="copy-button" onClick={() => void copy()}><Copy size={15} />Копировать</button></div></div><div className="demo-note"><Info size={15} />Это структурированный локальный шаблон, а не ответ модели. <button onClick={() => setModal('settings')}>Узнать о подключении ИИ</button>.</div><pre className="prompt-output">{current.output}</pre><div className="result-footer"><span>{current.model} <span>·</span> {current.options.language} <span>·</span> {current.output.length.toLocaleString('ru-RU')} символов</span><button onClick={() => { setRefining(true); updateInput(''); textarea.current?.focus(); textarea.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><RefreshCw size={14} />Доработать</button></div></section>}
          <section className="inspiration"><div className="section-heading"><div><span className="section-eyebrow">ОТ ИДЕИ К ВОЗМОЖНОСТЯМ</span><h2>Немного вдохновения</h2></div><button className="text-link" onClick={() => setModal('templates')}>Все шаблоны <ArrowRight size={15} /></button></div><div className="template-grid">{templates.map((t, i) => <button key={t.title} className={`template-card template-${i}`} onClick={() => useTemplate(t)} disabled={loading}><div className="template-image"><img src={t.image} alt={t.category} /><span className="template-tag"><ImageIcon size={11} />Для изображения</span><span className="template-arrow"><ArrowUpRight size={17} /></span></div><div className="template-info"><strong>{t.title}</strong><span>{t.category}</span></div></button>)}</div></section>
          <footer className="workspace-footer"><span><Sparkles size={13} />Сначала идея. Затем — всё остальное.</span><span>Создано для вашего творческого потока <span className="footer-star">✳</span></span></footer>
        </> : <section className="history-page"><div className="eyebrow"><span />ВАШЕ ПРОСТРАНСТВО ИДЕЙ</div><div className="history-title"><div><h1>{view === 'favorites' ? 'Всегда под рукой.' : 'У каждой идеи есть история.'}</h1><p>{view === 'favorites' ? 'Промпты, к которым хочется возвращаться.' : 'Ваши запросы и результаты. Продолжайте с того места, где остановились.'}</p></div><button className="primary" onClick={() => newPrompt('text')}><Plus size={17} />Новый промпт</button></div><div className="history-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Найти промпт…" aria-label="Поиск по истории" /><span>{filtered.length}</span></div>{error && <div className="error-message" role="alert">{error}</div>}{!filtered.length ? <div className="history-empty">{view === 'favorites' ? <Star size={36} /> : <History size={36} />}<h2>{query ? 'Ничего не найдено' : view === 'favorites' ? 'Сохраните лучшее' : 'Всё начинается с одной идеи'}</h2><p>{query ? 'Попробуйте другой поисковый запрос.' : view === 'favorites' ? 'Нажмите на звёздочку у готового промпта — он появится здесь.' : 'Создайте промпт, и мы сохраним его здесь автоматически.'}</p><button className="primary" onClick={() => query ? setQuery('') : newPrompt('text')}>{query ? 'Сбросить поиск' : 'Создать первый промпт'}<ArrowRight size={17} /></button></div> : <div className="history-list">{filtered.map(entry => <article key={entry.id}><button className="history-entry" onClick={() => openEntry(entry)}><span className="entry-icon">{entry.mode === 'text' ? <MessageSquare size={21} /> : entry.mode === 'image' ? <ImageIcon size={21} /> : <ScanLine size={21} />}</span><div><h3>{entry.title}</h3><p>{entry.output.slice(0, 140).replace(/#/g, '')}</p><span>{new Date(entry.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} · {entry.model} · {entry.options.language}</span></div><ChevronRight size={18} /></button><div className="history-entry-actions"><button className={`icon-button ${entry.favorite ? 'is-favorite' : ''}`} aria-label="Переключить избранное" onClick={() => void favorite(entry)}><Star size={17} fill={entry.favorite ? 'currentColor' : 'none'} /></button><button className="icon-button delete-button" aria-label="Удалить промпт" onClick={() => void remove(entry)}><Trash2 size={17} /></button></div></article>)}</div>}<div className="history-privacy"><ShieldCheck size={16} />История привязана к этому браузеру. Копия хранится на устройстве для чтения без сети.</div></section>}
      </main>
    </div>
    {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    {modal === 'settings' && <SettingsModal close={() => setModal(null)} />}
    {modal === 'knowledge' && <Modal title="Хороший промпт — не магия" close={() => setModal(null)}><p className="modal-description">Forma превращает вашу идею в понятную инструкцию. В каждый запрос уже встроена методика по открытым руководствам OpenAI и Anthropic — скачивать знания вручную не нужно.</p><div className="knowledge-steps">{[{ icon: MessageSquare, title: 'Роль и цель', text: 'Кем должна быть модель и какого результата вы хотите достичь.' }, { icon: Layers3, title: 'Контекст и ограничения', text: 'Важные детали отделяются от инструкций. Неизвестные данные не выдумываются.' }, { icon: SlidersHorizontal, title: 'Структура и формат', text: 'Понятные шаги, нужная глубина ответа и критерии качества.' }, { icon: ScanLine, title: 'Визуальная точность', text: 'Для изображений — композиция, свет, палитра и стиль. Для референсов — анализ фотографии без копирования чужой личности.' }].map(s => <div key={s.title}><span><s.icon size={21} /></span><div><h3>{s.title}</h3><p>{s.text}</p></div></div>)}</div><div className="info-box"><Info size={18} /><p>Английский может быть удобнее для многих моделей, но не гарантирует меньший расход токенов. Качество зависит от задачи и модели. Forma использует встроенные инструкции, а не обучает отдельную модель и не обещает идеальный результат.</p></div><div className="source-links"><a href="https://platform.openai.com/docs/guides/prompt-engineering" target="_blank" rel="noreferrer">OpenAI Prompt Engineering <ArrowUpRight size={15} /></a><a href="https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview" target="_blank" rel="noreferrer">Anthropic Prompt Engineering <ArrowUpRight size={15} /></a></div></Modal>}
    {modal === 'install' && <Modal title="Вдохновение всегда с вами" close={() => setModal(null)}><div className="install-illustration"><div className="phone-outline"><span /><Sparkles size={47} /><strong>forma.</strong></div><span className="install-star">✦</span></div><p className="modal-description">Установите Forma на iPhone — приложение откроется в отдельном окне, без лишних вкладок.</p><ol className="install-steps"><li><span>1</span><p>Откройте эту страницу в <strong>Safari</strong>.</p></li><li><span>2</span><p>Нажмите <Share2 size={17} /> <strong>«Поделиться»</strong> в меню браузера.</p></li><li><span>3</span><p>Выберите <strong>«На экран “Домой”»</strong>, затем «Добавить».</p></li></ol><div className="info-box"><Zap size={18} /><p>Конструктор, черновик и сохранённая история доступны без сети. Анализ фотографий появится после подключения отдельного безопасного API‑сервера.</p></div><button className="primary full" onClick={() => setModal(null)}>Всё понятно <Check size={17} /></button></Modal>}
    {modal === 'templates' && <Modal title="С чего начнётся ваша идея?" close={() => setModal(null)} wide><p className="modal-description">Выберите отправную точку и добавьте что-то своё.</p><div className="template-grid modal-templates">{templates.map(t => <button className="template-card" key={t.title} onClick={() => useTemplate(t)}><div className="template-image"><img src={t.image} alt={t.category} /></div><div className="template-info"><strong>{t.title}</strong><span>{t.category}</span></div></button>)}</div><h3 className="text-template-title">Для текстов и повседневных задач</h3><div className="text-templates">{quickIdeas.map(t => <button key={t.label} onClick={() => { newPrompt('text'); updateInput(t.input); setModal(null); }}><t.icon size={22} /><span><strong>{t.label}</strong><small>{t.input}</small></span><ArrowUpRight size={18} /></button>)}</div><p className="field-hint">Фотографии для вдохновения: eberhard grossgasteiger, Artem Podrez, Ejov Igor / Pexels.</p></Modal>}
  </div>;
}
