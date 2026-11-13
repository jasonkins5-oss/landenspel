import type { Country } from '../data/types';
import type { RoundResult } from '../core/game';
import { formatValue } from '../core/format';
import { rankCountries, rankOf, topN } from '../core/ranking';

export interface RevealScreenOptions {
  result: RoundResult;
  countries: readonly Country[];
  onNext: () => void;
  isLastRound: boolean;
}

/** Onthullingsscherm: gekozen land, rang, scorebalk, top 5 en de tijdstraf. */
export function renderRevealScreen(options: RevealScreenOptions): HTMLElement {
  const { result, countries, onNext, isLastRound } = options;
  const { stat, iso3, score } = result;
  const ranking = rankCountries(stat, countries);
  const top5 = topN(ranking, 5);
  const chosen = iso3 ? rankOf(ranking, iso3) : undefined;
  const chosenCountry = iso3 ? countries.find((c) => c.iso3 === iso3) : undefined;

  const el = document.createElement('div');
  el.className = 'reveal-screen';

  const statusLine = score.timedOut
    ? 'Tijd verlopen — geen punten.'
    : score.noData
      ? `Geen data bekend voor ${chosenCountry?.nameNl ?? 'dit land'} — geen punten.`
      : chosen
        ? `${chosenCountry!.nameNl}: ${formatValue(stat, chosen.value)} (plek ${chosen.rank} van ${ranking.length})`
        : 'Geen land gekozen.';

  el.innerHTML = `
    <h2 class="question">${stat.question}</h2>
    <p class="reveal-status">${escapeHtml(statusLine)}</p>
    <div class="score-breakdown">
      <div class="score-bar" role="img" aria-label="${score.total} van 1000 punten">
        <div class="score-bar__fill" style="width: ${(score.total / 1000) * 100}%"></div>
      </div>
      <p class="score-line">
        <strong>${score.total}</strong> punten
        ${score.penalty > 0 ? `<span class="muted">(${score.base} − ${score.penalty} tijdstraf)</span>` : ''}
      </p>
    </div>
    <ol class="top5">
      ${top5
        .map(
          (r) => `
        <li class="top5__item${iso3 === r.country.iso3 ? ' top5__item--chosen' : ''}">
          <span class="top5__rank">${r.rank}.</span>
          <span class="top5__name">${escapeHtml(r.country.nameNl)}</span>
          <span class="top5__value muted">${escapeHtml(formatValue(stat, r.value))}</span>
        </li>`,
        )
        .join('')}
    </ol>
    <p class="source muted">Bron: ${escapeHtml(stat.source)}, ${stat.year}</p>
    <button type="button" class="next-btn">${isLastRound ? 'Bekijk resultaat' : 'Volgende ronde'}</button>
  `;

  el.querySelector<HTMLButtonElement>('.next-btn')!.addEventListener('click', onNext);
  queueMicrotask(() => el.querySelector<HTMLButtonElement>('.next-btn')!.focus());

  return el;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
