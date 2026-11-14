import type { Item } from '../data/types';
import { TIME_LIMIT_SECONDS } from '../core/scoring';
import { Matcher, type Match } from '../core/match';
import { escapeHtml } from './html';

export interface RoundScreenHandle {
  el: HTMLElement;
  /** Stopt de timer; wordt door de aanroeper gebruikt bij het verlaten van het scherm. */
  destroy: () => void;
}

export interface RoundScreenOptions {
  roundNumber: number;
  totalRounds: number;
  question: string;
  matcher: Matcher<Item>;
  /** Placeholder in het invoerveld, bv. "Typ een land…". */
  placeholder: string;
  /** Epoch-ms waarop de ronde begon. Bij herladen loopt de timer zo gewoon door. */
  startedAt: number;
  /** Wordt precies één keer aangeroepen: op Enter met een antwoord, bij klikken op een suggestie, of bij het verlopen van de tijd. */
  onSubmit: (answerId: string | null, seconds: number) => void;
}

/** Omtrek van de timer-ring (r = 20 in een viewBox van 48). */
const RING = 2 * Math.PI * 20;

/**
 * Rondescherm: vraag bovenaan, onderaan een timer-ring, een invoerveld met autocomplete
 * (pijltjes + Enter, max. 6 suggesties, die boven het veld openklappen) en de GRAAF-knop.
 */
export function renderRoundScreen(options: RoundScreenOptions): RoundScreenHandle {
  const { roundNumber, totalRounds, question, matcher, placeholder, startedAt, onSubmit } = options;

  const el = document.createElement('div');
  el.className = 'round-screen';
  el.innerHTML = `
    <section class="panel question-panel">
      <p class="eyebrow">VRAAG ${roundNumber} VAN ${totalRounds}</p>
      <h2 class="question">${escapeHtml(question)}</h2>
      <p class="hint" aria-hidden="true">▼ hoe beter je antwoord, hoe dieper je graaft ▼</p>
    </section>
    <div class="round-gap" aria-hidden="true"></div>
    <form class="dock" autocomplete="off">
      <div class="timer" role="timer" aria-label="Resterende tijd">
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle class="timer__track" cx="24" cy="24" r="20"/>
          <circle class="timer__ring" cx="24" cy="24" r="20" stroke-dasharray="${RING}" stroke-dashoffset="0"/>
        </svg>
        <span class="timer__text"></span>
      </div>
      <div class="combobox">
        <input
          type="text"
          name="answer"
          class="answer-input"
          placeholder="${escapeHtml(placeholder)}"
          aria-label="${escapeHtml(placeholder.replace(/…$/, ''))}"
          aria-expanded="false"
          aria-autocomplete="list"
          aria-controls="suggestions-list"
          role="combobox"
          spellcheck="false"
          autocapitalize="off"
        />
        <ul class="suggestions" id="suggestions-list" role="listbox" aria-label="Suggesties" hidden></ul>
      </div>
      <button type="submit" class="btn btn--primary submit-btn" disabled>GRAAF</button>
    </form>
  `;

  const timerEl = el.querySelector<HTMLElement>('.timer')!;
  const timerText = el.querySelector<HTMLElement>('.timer__text')!;
  const ring = el.querySelector<SVGCircleElement>('.timer__ring')!;
  const input = el.querySelector<HTMLInputElement>('.answer-input')!;
  const list = el.querySelector<HTMLUListElement>('.suggestions')!;
  const submitBtn = el.querySelector<HTMLButtonElement>('.submit-btn')!;
  const form = el.querySelector<HTMLFormElement>('.dock')!;

  let submitted = false;
  let matches: Match<Item>[] = [];
  let activeIndex = -1;
  let selected: Item | null = null;
  const elapsedSeconds = () => (Date.now() - startedAt) / 1000;

  function finish(answerId: string | null) {
    if (submitted) return;
    submitted = true;
    clearInterval(timerHandle);
    const seconds = Math.min(elapsedSeconds(), TIME_LIMIT_SECONDS);
    onSubmit(answerId, seconds);
  }

  function updateTimer() {
    const remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsedSeconds());
    timerText.textContent = `${Math.ceil(remaining)}`;
    ring.setAttribute('stroke-dashoffset', String(RING * (1 - remaining / TIME_LIMIT_SECONDS)));
    timerEl.classList.toggle('timer--low', remaining <= 10);
    if (remaining <= 0) finish(selected?.id ?? null);
  }
  const timerHandle = window.setInterval(updateTimer, 200);
  updateTimer();

  function renderSuggestions() {
    list.innerHTML = '';
    if (matches.length === 0) {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      return;
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (activeIndex >= 0) input.setAttribute('aria-activedescendant', `suggestion-${activeIndex}`);
    else input.removeAttribute('aria-activedescendant');
    matches.forEach((m, i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.id = `suggestion-${i}`;
      li.className = 'suggestion' + (i === activeIndex ? ' suggestion--active' : '');
      li.textContent = m.item.nameNl;
      li.setAttribute('aria-selected', String(i === activeIndex));
      li.addEventListener('mousedown', (e) => {
        // mousedown (niet click) zodat dit vóór de blur van het invoerveld vuurt.
        e.preventDefault();
        choose(m.item);
      });
      list.appendChild(li);
    });
  }

  function choose(item: Item) {
    selected = item;
    input.value = item.nameNl;
    matches = [];
    activeIndex = -1;
    renderSuggestions();
    submitBtn.disabled = false;
  }

  input.addEventListener('input', () => {
    selected = null;
    input.classList.remove('answer-input--invalid');
    // De knop blijft actief zodra er tekst staat: een uitgeschakelde submit-knop blokkeert
    // ook het indienen met Enter. De submit-handler bepaalt of de invoer een antwoord oplevert.
    submitBtn.disabled = input.value.trim() === '';
    matches = matcher.search(input.value);
    activeIndex = matches.length > 0 ? 0 : -1;
    renderSuggestions();
  });

  input.addEventListener('keydown', (e) => {
    if (matches.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % matches.length;
      renderSuggestions();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + matches.length) % matches.length;
      renderSuggestions();
    } else if (e.key === 'Escape') {
      matches = [];
      activeIndex = -1;
      renderSuggestions();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const item =
      selected ??
      (activeIndex >= 0 ? matches[activeIndex]!.item : null) ??
      matcher.resolve(input.value);
    if (!item) {
      // Geen ondubbelzinnig antwoord: kort rood markeren, niets indienen.
      input.classList.remove('answer-input--invalid');
      void input.offsetWidth; // opnieuw starten van de schud-animatie
      input.classList.add('answer-input--invalid');
      return;
    }
    finish(item.id);
  });

  // Klikken buiten het invoerblok sluit de lijst, zonder iets in te dienen. Klikken binnen het
  // blok (ook op GRAAF) laat de lijst staan: anders gaat de gemarkeerde suggestie verloren
  // voordat het formulier wordt ingediend.
  const onDocumentClick = (e: MouseEvent) => {
    if (form.contains(e.target as Node)) return;
    matches = [];
    activeIndex = -1;
    renderSuggestions();
  };
  document.addEventListener('click', onDocumentClick);

  queueMicrotask(() => input.focus({ preventScroll: true }));

  return {
    el,
    destroy: () => {
      clearInterval(timerHandle);
      document.removeEventListener('click', onDocumentClick);
    },
  };
}
