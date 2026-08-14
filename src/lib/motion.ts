import { useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";

export const springSettle: Transition = {
  type: "spring",
  bounce: 0,
  duration: 0.35,
};

export const springMomentum: Transition = {
  type: "spring",
  bounce: 0.2,
  duration: 0.35,
};

export function useAppleMotion() {
  const reduceMotion = useReducedMotion();
  return { reduceMotion };
}
