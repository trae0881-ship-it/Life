"use client";

import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";

export function useAuthExperienceMotion(root: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let context: gsap.Context | undefined;

    const updateMotion = () => {
      context?.revert();
      context = undefined;
      if (reducedMotion.matches) return;

      context = gsap.context(() => {
        const entranceItems = gsap.utils.toArray<HTMLElement>("[data-auth-enter]", element);
        gsap.from(entranceItems, {
          autoAlpha: 0,
          y: 18,
          duration: 0.75,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "opacity,visibility,transform",
        });

        const firstOrbit = element.querySelector(".auth-orbit-one");
        const secondOrbit = element.querySelector(".auth-orbit-two");
        const thirdOrbit = element.querySelector(".auth-orbit-three");
        if (firstOrbit) gsap.to(firstOrbit, { rotation: 360, duration: 48, repeat: -1, ease: "none" });
        if (secondOrbit) gsap.to(secondOrbit, { rotation: -360, duration: 68, repeat: -1, ease: "none" });
        if (thirdOrbit) gsap.to(thirdOrbit, { rotation: 360, duration: 92, repeat: -1, ease: "none" });

        const stars = gsap.utils.toArray<HTMLElement>(".auth-star", element);
        stars.forEach((star, index) => {
          gsap.to(star, {
            x: index % 2 === 0 ? 7 : -7,
            y: index % 3 === 0 ? -8 : 8,
            opacity: index % 2 === 0 ? 0.78 : 0.28,
            duration: 2.8 + (index % 5) * 0.45,
            delay: (index % 7) * 0.18,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        });

        const glow = element.querySelector(".auth-cosmos-glow-one");
        if (glow) gsap.to(glow, { scale: 1.12, opacity: 0.74, duration: 9, repeat: -1, yoyo: true, ease: "sine.inOut" });
      }, element);
    };

    updateMotion();
    reducedMotion.addEventListener("change", updateMotion);
    return () => {
      reducedMotion.removeEventListener("change", updateMotion);
      context?.revert();
    };
  }, [root]);
}
