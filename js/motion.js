/* TAA motion: custom choreography; scroll reveal lineage: FitnessIcon/js/main.js. */
(() => {
  const root = document.documentElement;
  const reveal = '[data-reveal], [data-hero-reveal]';
  const uncloak = () => {
    clearTimeout(window.taaMotionFallback);
    root.classList.remove('motion-ready');
    root.dataset.motion = 'fallback';
  };
  if (!window.gsap || !window.ScrollTrigger) { uncloak(); return; }
  // A slow download must not re-hide a page the safety timer already revealed.
  if (root.dataset.motion === 'fallback') return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  try {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add({desktop:'(min-width: 1024px)', mobile:'(max-width: 1023px)', reduce:'(prefers-reduced-motion: reduce)'}, context => {
      const { desktop, reduce } = context.conditions;
      if (reduce) {
        root.classList.remove('motion-ready');
        gsap.set(reveal, { clearProps:'opacity,visibility,transform' });
        root.dataset.motion = 'reduced';
        return;
      }
      // Re-entry after resizing/reduced-motion changes must not replay hidden content.
      const isInitial = !root.dataset.motion;
      root.dataset.motion = 'active';
      const targets = [...document.querySelectorAll('[data-reveal]')];
      if (isInitial) {
        const hero = gsap.timeline({defaults:{duration:.8, ease:'power3.out'}});
        hero.to('.headline-word', {opacity:1, y:0, stagger:.1}, 0)
          .to('.hero-copy > [data-hero-reveal]', {opacity:1, y:0, stagger:.08}, .15)
          .to('.hero-main', {opacity:1, y:0, scale:1, duration:1}, .16)
          .to('.hero-secondary', {opacity:1, y:0, scale:1, duration:.85}, .35)
          .to('.hero-stamp', {opacity:1, y:0, duration:.65}, .55);
        // Static class is removed per element, so cleared inline styles cannot re-cloak it.
        hero.eventCallback('onComplete', () => {
          document.querySelectorAll('[data-hero-reveal]').forEach(el => el.classList.add('is-revealed'));
          gsap.set('[data-hero-reveal]',{clearProps:'transform,opacity'});
        });
      } else {
        document.querySelectorAll(reveal).forEach(el => el.classList.add('is-revealed'));
      }
      const finish = elements => elements.forEach(el => el.classList.add('is-revealed'));
      ScrollTrigger.batch(targets.filter(el => !el.classList.contains('is-revealed')), {
        start:'top 93%', once:true, interval:.08, batchMax:4,
        onEnter: elements => gsap.to(elements, {
          opacity:1, y:0, duration:desktop?.65:.4, stagger:desktop?.07:.035, overwrite:'auto',
          onComplete:() => { finish(elements); gsap.set(elements,{clearProps:'transform,opacity'}); }
        })
      });
      // Preserve access on deep links, fast scrolling, and keyboard navigation.
      const showPast = () => {
        const passed = targets.filter(el => !el.classList.contains('is-revealed') && el.getBoundingClientRect().bottom < 0);
        if (!passed.length) return;
        finish(passed);
        gsap.set(passed,{opacity:1,y:0,clearProps:'transform,opacity'});
      };
      showPast();
      const focusReveal = event => {
        const parent = event.target.closest('[data-reveal],[data-hero-reveal]');
        if (parent) { gsap.killTweensOf(parent); finish([parent]); gsap.set(parent,{clearProps:'transform,opacity'}); }
      };
      document.addEventListener('focusin', focusReveal);
      gsap.to('.reading-progress', {scaleX:1, ease:'none', scrollTrigger:{start:0,end:'max',scrub:true}});
      // Adapted from FitnessIcon/js/main.js: separate wrappers preserve the photo entrances.
      if (desktop) {
        gsap.utils.toArray('[data-collage]').forEach(collage => {
          gsap.fromTo(collage.querySelector('[data-collage-main]'), {y:-8}, {
            y:8,ease:'none',scrollTrigger:{trigger:collage,start:'top bottom',end:'bottom top',scrub:1}
          });
          gsap.fromTo(collage.querySelector('[data-collage-over]'), {y:22}, {
            y:-18,ease:'none',scrollTrigger:{trigger:collage,start:'top bottom',end:'bottom top',scrub:1}
          });
        });
      }
      // Adapted stroke-offset technique: saved ikrprojects/KwgGBRp source, new TAA paths.
      document.querySelectorAll('.process-arrow path,.collage-thread path').forEach(path => {
        const length = path.getTotalLength();
        const isHero = path.closest('.hero-art');
        gsap.fromTo(path,{strokeDasharray:length,strokeDashoffset:length},{
          strokeDashoffset:0,ease:'none',duration:1.1,delay:isHero?.4:0,
          ...(isHero ? {} : {scrollTrigger:{trigger:'.process-intro',start:'top 85%',end:'top 30%',scrub:.6}})
        });
      });
      gsap.utils.toArray('.step').forEach((step,i) => {
        gsap.to(step,{'--step-progress':1,duration:.8,delay:desktop?i*.1:0,
          scrollTrigger:{trigger:step,start:'top 80%',once:true}});
      });
      return () => document.removeEventListener('focusin', focusReveal);
    });
    clearTimeout(window.taaMotionFallback);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh(), {once:true});
    document.querySelectorAll('details').forEach(el => el.addEventListener('toggle', () => ScrollTrigger.refresh()));
    // Forms, image/font loading and FAQ expansion change the scroll range.
    let refreshTimer;
    new ResizeObserver(() => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(),100);
    }).observe(document.querySelector('main'));
  } catch (error) {
    gsap.killTweensOf(reveal);
    gsap.set(reveal,{clearProps:'all'});
    uncloak();
    console.warn('Motion unavailable; all content remains visible.', error);
  }
})();
