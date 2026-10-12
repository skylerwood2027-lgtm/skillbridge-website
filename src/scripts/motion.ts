// Site motion: GSAP for choreography, Lenis for smooth scrolling.
//
// Effects are adapted from Magic UI (blur-fade, animated-beam, scroll-progress)
// and React Bits (SplitText) and rebuilt on GSAP, so the site stays a static
// Astro build with no React or Tailwind runtime.
//
// Everything here is progressive enhancement. With reduced motion or no JS, the
// page renders finished: nothing below runs, and the inline head script never
// adds the `motion-pending` class that briefly hides the hero.
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

const root = document.documentElement;
const release = () => root.classList.remove('motion-pending');

declare global {
  interface Window { lenis?: Lenis }
}

function smoothScroll() {
  // Offset clears the sticky header (70px) the same way scroll-margin does.
  const lenis = new Lenis({ lerp: 0.12, anchors: { offset: -80 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.lenis = lenis;
  return () => {
    lenis.destroy();
    delete window.lenis;
  };
}

// The one orchestrated moment: the headline rises, the founders come into focus,
// then the bridge from the logo is built (deck, towers, cable, hangers) and a
// single light crosses it.
function heroIntro() {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  const title = hero.querySelector<HTMLElement>('[data-hero="title"]');
  if (title) {
    const split = SplitText.create(title, { type: 'words,lines', mask: 'lines' });
    tl.from(split.words, { yPercent: 110, duration: 0.9, stagger: 0.06, ease: 'power4.out' }, 0);
  }

  // Magic UI blur-fade: 6px blur, 6px offset.
  tl.from(
    hero.querySelectorAll('[data-hero="fade"]'),
    { autoAlpha: 0, y: 6, filter: 'blur(6px)', duration: 0.6, stagger: 0.1, clearProps: 'filter' },
    0.35,
  );
  tl.from(
    hero.querySelectorAll('.portrait'),
    { autoAlpha: 0, y: 14, filter: 'blur(6px)', duration: 0.8, stagger: 0.12, clearProps: 'filter' },
    0.15,
  );

  const bridge = hero.querySelector<HTMLElement>('.bridge');
  if (bridge) {
    const q = (s: string) => bridge.querySelectorAll(s);
    // On a short screen (phones) the bridge starts below the fold, so it is
    // built when it scrolls into view instead of offscreen during the intro.
    const onScreen = bridge.getBoundingClientRect().top < window.innerHeight * 0.9;
    const build = onScreen
      ? tl
      : gsap.timeline({ defaults: { ease: 'power3.out' }, scrollTrigger: { trigger: bridge, start: 'top 90%', once: true } });
    const t0 = onScreen ? 0 : -0.3;
    build.from(q('.bridge__deck'), { drawSVG: '0%', duration: 1.1, ease: 'power2.inOut' }, 0.3 + t0)
      .from(q('.bridge__tower'), { drawSVG: '0%', duration: 0.6, stagger: 0.12, ease: 'power2.out' }, 0.95 + t0)
      .from(q('.bridge__cable'), { drawSVG: '0%', duration: 1.2, ease: 'power1.inOut' }, 1.25 + t0)
      .from(
        q('.bridge__hanger'),
        { scaleY: 0, transformOrigin: '50% 0%', duration: 0.4, stagger: { each: 0.022, from: 'center' }, ease: 'power2.out' },
        1.65 + t0,
      )
      // Magic UI animated-beam, run once along the deck.
      .fromTo(
        q('.bridge__pulse'),
        { drawSVG: '0% 5%', opacity: 1 },
        // immediateRender off: the pulse must stay hidden until its turn.
        { drawSVG: '95% 100%', duration: 1.5, ease: 'power1.inOut', immediateRender: false },
        '>-0.15',
      )
      .to(q('.bridge__pulse'), { opacity: 0, duration: 0.35 }, '>-0.3');
  }

  // from() tweens have already applied their start states, so the hero can be
  // shown without a flash of the finished layout.
  release();

  // The founders drift up a little as the hero scrolls away.
  gsap.to(hero.querySelector('.hero__portraits'), {
    yPercent: -8,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
}

// Section headings reveal line by line behind a mask (React Bits SplitText,
// power3.out). Replaces the generic fade-up for headings only.
function headingReveals() {
  document.querySelectorAll<HTMLElement>('main h2').forEach((h) => {
    h.classList.remove('reveal');
    SplitText.create(h, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 105,
          duration: 0.8,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: { trigger: h, start: 'top 88%', once: true },
        }),
    });
  });
}

// The faint logo motif in a band turns slowly as the band passes.
function motifDrift() {
  document.querySelectorAll<HTMLElement>('.cta-band__motif').forEach((m) => {
    gsap.fromTo(
      m,
      { yPercent: -50, rotate: -14 },
      {
        yPercent: -50,
        rotate: 2,
        ease: 'none',
        scrollTrigger: { trigger: m.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

// Magic UI scroll-progress: a hairline under the header, only on pages long
// enough for it to answer "how much is left".
function scrollProgress() {
  const bar = document.querySelector<HTMLElement>('.scroll-progress');
  if (!bar) return;
  if (document.documentElement.scrollHeight < window.innerHeight * 3.5) return;
  bar.hidden = false;
  gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
}

const mm = gsap.matchMedia();
mm.add('(prefers-reduced-motion: no-preference)', () => {
  const stopScroll = smoothScroll();
  // Split text only after the web fonts land, or line breaks would be measured
  // against the fallback face. Never wait longer than the hide-timeout in the head.
  const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 900))]);
  fontsReady.then(() => {
    heroIntro();
    headingReveals();
    motifDrift();
    scrollProgress();
    ScrollTrigger.refresh();
  });
  return () => stopScroll();
});
mm.add('(prefers-reduced-motion: reduce)', release);
