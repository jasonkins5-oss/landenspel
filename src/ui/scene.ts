import {
  DEPTH_FACTS,
  LAYERS,
  MAX_DEPTH_UNITS,
  formatDepth,
  kmToUnits,
  layerAt,
  unitsToKm,
} from '../core/depth';
import { hashString, mulberry32 } from '../core/rng';
import { CLOUD, DIGGER, DRILL, SUN } from './sprites';

/** Hoogte van de lucht boven het maaiveld, in px. */
const SKY_PX = 420;
/** Eén eenheid diepte = één pixel. 7000 eenheden = het middelpunt. */
const PX_PER_UNIT = 1;
/** Extra grond onder het middelpunt, zodat de camera daar ook kan centreren. */
const BOTTOM_PAD_PX = 900;
/** Hoogte van de grillige bovenrand van elke laag. */
const JAG_PX = 16;
/** Waar het maaiveld staat op het startscherm, vanaf de bovenkant van het venster. */
const SURFACE_SCREEN_Y = 300;
/** Waar de boorkop staat tijdens het spel, als fractie van de vensterhoogte. */
const DIG_ANCHOR = 0.5;

export type SceneView = 'surface' | 'dig';

export interface Scene {
  el: HTMLElement;
  /** Zet de boor op een diepte (eenheden = punten). */
  setDepth(units: number, animate: boolean): void;
  setView(view: SceneView, animate: boolean): void;
  /** Rondvliegend gruis bij de boorkop. */
  burst(): void;
}

const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Een kleine pixeltextuur (ruis met een paar steentjes) als data-URL, deterministisch per seed. */
function texture(colors: readonly string[], seed: string, size = 32): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const rand = mulberry32(hashString(seed));
  ctx.fillStyle = colors[0]!;
  ctx.fillRect(0, 0, size, size);
  // Ruis in 2x2-blokjes, vooral in de tweede en derde kleur.
  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const r = rand();
      if (r < 0.28) {
        ctx.fillStyle = colors[r < 0.14 ? 1 : 2] ?? colors[0]!;
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
  // Een paar steentjes in de accentkleur.
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rand() * (size - 4));
    const y = Math.floor(rand() * (size - 3));
    ctx.fillStyle = colors[3] ?? colors[1]!;
    ctx.fillRect(x, y, 4, 2);
    ctx.fillRect(x + 1, y + 2, 2, 1);
  }
  return canvas.toDataURL();
}

/** clip-path met een getrapte bovenrand, zodat lagen er "gehakt" uitzien. */
function jaggedTop(seed: string): string {
  const rand = mulberry32(hashString(seed));
  const points: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const y = Math.floor(rand() * 3) * (JAG_PX / 3);
    points.push(`${x}% ${y}px`);
    if (i < steps) points.push(`${((i + 1) / steps) * 100}% ${y}px`);
  }
  points.push('100% 100%', '0% 100%');
  return `polygon(${points.join(', ')})`;
}

export function createScene(): Scene {
  const el = document.createElement('div');
  el.className = 'scene';
  el.setAttribute('aria-hidden', 'true');

  const world = document.createElement('div');
  world.className = 'scene__world';
  world.style.height = `${SKY_PX + MAX_DEPTH_UNITS * PX_PER_UNIT + BOTTOM_PAD_PX}px`;
  el.appendChild(world);

  // Lucht met zon en wolken.
  const sky = document.createElement('div');
  sky.className = 'scene__sky';
  sky.style.height = `${SKY_PX}px`;
  sky.innerHTML = `
    <div class="scene__sun">${SUN}</div>
    <div class="scene__cloud" style="top: 60px; left: 8%">${CLOUD}</div>
    <div class="scene__cloud scene__cloud--slow" style="top: 150px; left: 58%">${CLOUD}</div>
    <div class="scene__cloud" style="top: 250px; left: 84%">${CLOUD}</div>
  `;
  world.appendChild(sky);

  // Aardlagen, elk met een eigen textuur en een grillige bovenrand.
  LAYERS.forEach((layer, i) => {
    const div = document.createElement('div');
    div.className = `scene__layer scene__layer--${layer.id}`;
    const isLast = i === LAYERS.length - 1;
    const top = SKY_PX + layer.from * PX_PER_UNIT - (i === 0 ? 0 : JAG_PX);
    const height =
      (layer.to - layer.from) * PX_PER_UNIT + (i === 0 ? 0 : JAG_PX) + (isLast ? BOTTOM_PAD_PX : 0);
    div.style.top = `${top}px`;
    div.style.height = `${height}px`;
    div.style.zIndex = String(i + 1);
    div.style.backgroundColor = layer.colors[0]!;
    div.style.backgroundImage = `url(${texture(layer.colors, layer.id)})`;
    if (i > 0) div.style.clipPath = jaggedTop(layer.id);
    world.appendChild(div);
  });

  // Gras op het maaiveld.
  const grass = document.createElement('div');
  grass.className = 'scene__grass';
  grass.style.top = `${SKY_PX - 10}px`;
  grass.style.backgroundImage = `url(${texture(['#3f9a3a', '#4fb446', '#2f7d2c', '#6fd05f'], 'gras', 16)})`;
  grass.style.clipPath = jaggedTop('gras');
  world.appendChild(grass);

  // Schacht, boor en graafmachine. Alles hangt aan dezelfde x-positie (CSS: --shaft-x).
  const shaft = document.createElement('div');
  shaft.className = 'scene__shaft';
  shaft.style.top = `${SKY_PX}px`;
  world.appendChild(shaft);

  const drill = document.createElement('div');
  drill.className = 'scene__drill';
  drill.innerHTML = DRILL;
  world.appendChild(drill);

  const digger = document.createElement('div');
  digger.className = 'scene__digger';
  digger.style.top = `${SKY_PX - 46}px`;
  digger.innerHTML = DIGGER;
  world.appendChild(digger);

  // Dieptemeter rechts: laaggrenzen en de "JIJ"-markering.
  const gauge = document.createElement('div');
  gauge.className = 'scene__gauge';
  gauge.style.top = `${SKY_PX}px`;
  gauge.style.height = `${MAX_DEPTH_UNITS * PX_PER_UNIT}px`;
  // De bovenste laag krijgt geen label: daar staat de JIJ-markering aan het begin.
  gauge.innerHTML = LAYERS.slice(1)
    .map(
      (l) => `
      <div class="scene__tick${l.darkText ? ' scene__tick--dark' : ''}" style="top: ${l.from * PX_PER_UNIT}px">
        <span>${formatDepth(unitsToKm(l.from))} · ${l.name.toUpperCase()}</span>
      </div>`,
    )
    .join('');
  const you = document.createElement('div');
  you.className = 'scene__you';
  you.innerHTML = '<span>JIJ ◄</span>';
  gauge.appendChild(you);
  world.appendChild(gauge);

  // Weetjes langs de schacht, om en om links en rechts.
  DEPTH_FACTS.forEach((fact, i) => {
    const units = kmToUnits(fact.km);
    const div = document.createElement('div');
    const dark = layerAt(Math.min(units, MAX_DEPTH_UNITS - 1)).darkText;
    div.className = `scene__fact scene__fact--${i % 2 === 0 ? 'right' : 'left'}${dark ? ' scene__fact--dark' : ''}`;
    div.style.top = `${SKY_PX + units * PX_PER_UNIT}px`;
    div.textContent = i % 2 === 0 ? `── ${fact.text}` : `${fact.text} ──`;
    world.appendChild(div);
  });

  let depthUnits = 0;
  let view: SceneView = 'surface';

  function cameraOffset(): number {
    const vh = window.innerHeight;
    const target =
      view === 'surface'
        ? SKY_PX - SURFACE_SCREEN_Y
        : SKY_PX + depthUnits * PX_PER_UNIT - vh * DIG_ANCHOR;
    return Math.max(0, target);
  }

  function apply(animate: boolean) {
    const instant = !animate || reducedMotion();
    el.classList.toggle('scene--instant', instant);
    const px = depthUnits * PX_PER_UNIT;
    shaft.style.height = `${px}px`;
    drill.style.top = `${SKY_PX + px - 6}px`;
    you.style.top = `${px}px`;
    world.style.transform = `translateY(${-cameraOffset()}px)`;
    el.dataset.view = view;
  }

  window.addEventListener('resize', () => apply(false));
  apply(false);

  return {
    el,
    setDepth(units, animate) {
      depthUnits = Math.max(0, Math.min(MAX_DEPTH_UNITS, units));
      apply(animate);
    },
    setView(next, animate) {
      view = next;
      apply(animate);
    },
    burst() {
      if (reducedMotion()) return;
      const rand = Math.random;
      for (let i = 0; i < 14; i++) {
        const bit = document.createElement('span');
        bit.className = 'scene__debris';
        bit.style.top = drill.style.top;
        bit.style.setProperty('--dx', `${(rand() - 0.5) * 120}px`);
        bit.style.setProperty('--dy', `${-20 - rand() * 60}px`);
        bit.style.setProperty('--delay', `${rand() * 900}ms`);
        bit.style.backgroundColor = layerAt(depthUnits).colors[(i % 3) + 1] ?? '#8a5733';
        world.appendChild(bit);
        window.setTimeout(() => bit.remove(), 2200);
      }
    },
  };
}
