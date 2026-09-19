import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CalendarDays, Check, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const entrance = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="shell hero" id="care" aria-labelledby="hero-title">
      <motion.div
        className="hero-copy"
        initial={prefersReducedMotion ? false : "hidden"}
        animate="visible"
        variants={entrance}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="eyebrow"><Sparkles size={14} /> Thoughtful family healthcare</div>
        <h1 id="hero-title">Care that feels <span>personal.</span><br />Booking that feels effortless.</h1>
        <p className="hero-lead">
          A calmer way to connect with trusted doctors, manage appointments, and keep your care journey clear.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary button-large" to="/signup">
            Book an appointment <ArrowRight size={18} />
          </Link>
          <Link className="button button-secondary button-large" to="/login">Meet our doctors</Link>
        </div>
        <ul className="trust-list" aria-label="Clinic benefits">
          <li><Check size={15} /> Simple scheduling</li>
          <li><Check size={15} /> Private by design</li>
          <li><Check size={15} /> Family-centered care</li>
        </ul>
      </motion.div>

      <motion.div
        className="hero-visual"
        id="availability-preview"
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, x: 22 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="orbital-ring ring-one" />
        <div className="orbital-ring ring-two" />
        <div className="care-card glass-panel">
          <div className="care-card-head">
            <span className="icon-tile"><CalendarDays size={20} /></span>
            <div><span>Next available</span><strong>Today, 4:30 PM</strong></div>
          </div>
          <div className="doctor-row">
            <div className="doctor-avatar">AK</div>
            <div><strong>Dr. Ayesha Khan</strong><span>Family Medicine</span></div>
            <span className="availability"><i /> Available</span>
          </div>
          <div className="slot-row">
            <span>3:30 PM</span><span>4:00 PM</span><span className="slot-active">4:30 PM</span>
          </div>
          <Link className="booking-preview" to="/signup">Continue to booking <ArrowRight size={16} /></Link>
        </div>
        <div className="privacy-chip glass-panel" id="privacy"><ShieldCheck size={18} /><span><strong>Your care, protected</strong>Private and secure by design</span></div>
      </motion.div>
    </section>
  );
}
