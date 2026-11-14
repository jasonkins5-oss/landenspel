import { escapeHtml } from './html';

/** Seconden per vraag. Geen tijdstraf: alleen zeldzaamheid telt. */
export const TIME_LIMIT_SECONDS = 30;

export interface RoundScreenHandle {
  el: HTMLElement;
  /** Stopt de timer; wordt door de aanroeper gebruikt bij het verlaten van het scherm. */
  destroy: () => void;
}

export type AnswerOutcome = 'accepted' | 'unknown';

export interface RoundScreenOptions {
  roundNumber: number;
  totalRounds: number;
  prompt: string;
  /** Epoch-ms waarop de ronde begon. Bij herladen loopt de timer zo gewoon door. */
  startedAt: number;
  /** Lost op zodra de antwoorden van deze vraag geladen zijn; tot dan staat de knop op LOADING. */
  ready: Promise<void>;
  /**
   * Het getypte antwoord. 'unknown': we kennen het niet, de speler mag opnieuw proberen.
   * 'accepted': de aanroeper gaat naar de onthulling.
   */
  onAnswer: (text: string) => Promise<AnswerOutcome>;
  onTimeout: () => void;
}

/** Omtrek van de timer-ring (r = 20 in een viewBox van 48). */
const RING = 2 * Math.PI * 20;

/**
 * Rondescherm: vraag bovenaan, onderaan een timer-ring, een vrij invoerveld (geen suggesties,
 * die zouden de niche antwoorden verraden) en de DIG-knop.
 */
export function renderRoundScreen(options: RoundScreenOptions): RoundScreenHandle {
  const { roundNumber, totalRounds, prompt, startedAt } = options;

  const el = document.createElement('div');
  el.className = 'round-screen';
  el.innerHTML = `
    <section class="panel question-panel">
      <p class="eyebrow">PROMPT ${roundNumber} OF ${totalRounds}</p>
      <h2 class="question">${escapeHtml(prompt)}</h2>
      <p class="hint" aria-hidden="true">▼ the rarer your answer, the deeper you dig ▼</p>
    </section>
    <div class="round-gap" aria-hidden="true"></div>
    <p class="answer-feedback" role="status" aria-live="assertive"></p>
    <form class="dock" autocomplete="off">
      <div class="timer" role="timer" aria-label="Time left">
        <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <circle class="timer__track" cx="24" cy="24" r="20"/>
          <circle class="timer__ring" cx="24" cy="24" r="20" stroke-dasharray="${RING}" stroke-dashoffset="0"/>
        </svg>
        <span class="timer__text"></span>
      </div>
      <input
        type="text"
        name="answer"
        class="answer-input"
        placeholder="Type one answer…"
        aria-label="Your answer"
        maxlength="80"
        spellcheck="false"
        autocapitalize="off"
        autocorrect="off"
        enterkeyhint="go"
      />
      <button type="submit" class="btn btn--primary submit-btn" disabled>DIG</button>
    </form>
  `;

  const timerEl = el.querySelector<HTMLElement>('.timer')!;
  const timerText = el.querySelector<HTMLElement>('.timer__text')!;
  const ring = el.querySelector<SVGCircleElement>('.timer__ring')!;
  const input = el.querySelector<HTMLInputElement>('.answer-input')!;
  const submitBtn = el.querySelector<HTMLButtonElement>('.submit-btn')!;
  const form = el.querySelector<HTMLFormElement>('.dock')!;
  const feedback = el.querySelector<HTMLElement>('.answer-feedback')!;

  let finished = false;
  let busy = false;
  let loaded = false;
  const elapsedSeconds = () => (Date.now() - startedAt) / 1000;

  function stop() {
    finished = true;
    clearInterval(timerHandle);
  }

  function updateTimer() {
    const remaining = Math.max(0, TIME_LIMIT_SECONDS - elapsedSeconds());
    timerText.textContent = `${Math.ceil(remaining)}`;
    ring.setAttribute('stroke-dashoffset', String(RING * (1 - remaining / TIME_LIMIT_SECONDS)));
    timerEl.classList.toggle('timer--low', remaining <= 10);
    if (remaining <= 0 && !finished && !busy) {
      stop();
      options.onTimeout();
    }
  }
  const timerHandle = window.setInterval(updateTimer, 200);
  updateTimer();

  function refreshButton() {
    submitBtn.disabled = busy || !loaded || input.value.trim() === '';
    submitBtn.textContent = busy ? 'DIGGING…' : loaded ? 'DIG' : 'LOADING…';
  }
  refreshButton();
  options.ready.then(
    () => {
      loaded = true;
      refreshButton();
    },
    () => {
      feedback.textContent =
        'Could not load the answers for this prompt. Check your connection and reload.';
    },
  );

  input.addEventListener('input', () => {
    input.classList.remove('answer-input--invalid');
    feedback.textContent = '';
    refreshButton();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (finished || busy || !loaded || !text) return;
    busy = true;
    refreshButton();
    void options.onAnswer(text).then((outcome) => {
      busy = false;
      if (outcome === 'accepted') {
        stop();
        return;
      }
      // Onbekend: geen beurt kwijt, opnieuw proberen.
      feedback.textContent = `We don't know “${text}”. Try another answer.`;
      input.classList.remove('answer-input--invalid');
      void input.offsetWidth; // opnieuw starten van de schud-animatie
      input.classList.add('answer-input--invalid');
      input.select();
      refreshButton();
      updateTimer();
    });
  });

  queueMicrotask(() => input.focus({ preventScroll: true }));

  return { el, destroy: stop };
}
