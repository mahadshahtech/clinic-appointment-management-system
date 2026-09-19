import { motion, useReducedMotion } from "framer-motion";

export function AmbientBackground() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-grid" />
      <motion.div
        className="aurora aurora-mint"
        animate={prefersReducedMotion ? false : { x: [0, 42, -12, 0], y: [0, -24, 22, 0] }}
        transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="aurora aurora-blue"
        animate={prefersReducedMotion ? false : { x: [0, -34, 18, 0], y: [0, 30, -18, 0] }}
        transition={{ duration: 27, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <div className="ambient-vignette" />
    </div>
  );
}
