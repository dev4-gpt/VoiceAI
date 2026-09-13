import { useEffect } from 'react';
import { gsap } from 'gsap';

export function useRevealMotion(rootRef: React.RefObject<HTMLElement>): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!rootRef.current) return;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from('[data-reveal="text"]', {
        opacity: 0,
        y: 16,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.06
      });
      gsap.from('[data-reveal="card"]', {
        opacity: 0,
        y: 16,
        scale: 0.98,
        duration: 0.4,
        ease: 'back.out(1.4)',
        stagger: 0.06
      });
    }, rootRef.current);

    return () => ctx.revert();
  }, [rootRef]);
}
