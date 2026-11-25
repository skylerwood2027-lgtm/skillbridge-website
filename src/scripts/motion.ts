// Site motion, brief v2. Three things move on this site and only one of them
// needs JavaScript:
//
//   1. The bridge build (this file): deck, towers, cable, hangers, then one light
//      crossing, 1.6s in total, played once when the bridge scrolls into view.
//   2. The hero settling in on load: CSS in src/pages/index.astro.
//   3. Reel cards lifting on hover or press: CSS in src/components/ReelCard.astro.
//
// No smooth-scroll library, no parallax, no scroll-linked effects. With reduced
// motion or no JS nothing here runs and the bridge is simply drawn finished.
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(DrawSVGPlugin);

function bridgeBuild(bridge: HTMLElement) {
  const q = (s: string) => bridge.querySelectorAll(s);
  let tl: gsap.core.Timeline | null = null;

  // Arming hides the strokes (the from() start states), so it only ever happens
  // while the bridge is still below the screen. Until then the bridge stays
  // drawn, which is also what a visitor who never scrolls gets.
  const arm = () => {
    tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
    tl.from(q('.bridge__deck'), { drawSVG: '0%', duration: 0.5, ease: 'power2.inOut' }, 0)
      .from(q('.bridge__tower'), { drawSVG: '0%', duration: 0.35, stagger: 0.08 }, 0.3)
      .from(q('.bridge__cable'), { drawSVG: '0%', duration: 0.55, ease: 'power1.inOut' }, 0.45)
      .from(
        q('.bridge__hanger'),
        { scaleY: 0, transformOrigin: '50% 0%', duration: 0.24, stagger: { amount: 0.12, from: 'center' } },
        0.74,
      )
      // The one light, run once along the deck.
      .fromTo(
        q('.bridge__pulse'),
        { drawSVG: '0% 7%', opacity: 1 },
        // immediateRender off: the light must stay hidden until its turn.
        { drawSVG: '93% 100%', duration: 0.5, ease: 'power1.inOut', immediateRender: false },
        1.0,
      )
      .to(q('.bridge__pulse'), { opacity: 0, duration: 0.1, ease: 'none' }, 1.5)
      // Hand the strokes back to plain CSS so a later resize cannot leave a
      // dash pattern measured for the old width.
      .set(q('line, path'), { clearProps: 'strokeDasharray,strokeDashoffset,transform' }, 1.6);
  };

  const start = () => {
    const armer = new IntersectionObserver(
      (entries) => {
        const entry = entries.find((e) => e.isIntersecting);
        if (!entry) return;
        armer.disconnect();
        // Already on screen (a reload halfway down the page): hiding it now
        // would flash, so leave it finished.
        if (entry.boundingClientRect.top < window.innerHeight) return;
        arm();
        const player = new IntersectionObserver(
          (hits) => {
            if (!hits.some((e) => e.isIntersecting)) return;
            player.disconnect();
            tl?.play();
          },
          { rootMargin: '0px 0px -12% 0px' },
        );
        player.observe(bridge);
      },
      // A band one screen tall below the fold: near enough to be next, far
      // enough that the strokes are hidden before anyone can see them.
      { rootMargin: '0px 0px 100% 0px' },
    );
    armer.observe(bridge);
  };

  // Wait for a real scroll before touching the drawing at all.
  window.addEventListener('scroll', start, { once: true, passive: true });
}

const bridge = document.querySelector<HTMLElement>('.bridge');
const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (bridge && motionOk && 'IntersectionObserver' in window) bridgeBuild(bridge);
