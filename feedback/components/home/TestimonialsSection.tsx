"use client";

import { useEffect, useState } from "react";

interface PublicTestimonial {
  name: string | null;
  body: string;
  rating: number | null;
}

/**
 * Pulls approved testimonials from /api/testimonials/public.
 * Not yet wired into any visible page — see SHOW_TESTIMONIALS flag
 * in the page that imports this once ready to go live.
 */
export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);

  useEffect(() => {
    fetch("/api/testimonials/public")
      .then((res) => res.json())
      .then((data: { testimonials: PublicTestimonial[] }) => {
        setTestimonials(data.testimonials ?? []);
      })
      .catch(() => undefined);
  }, []);

  if (testimonials.length === 0) return null;

  return (
    <section className="testimonials-section" aria-label="What people are saying">
      <p className="testimonials-section-label">What people are saying</p>
      <div className="testimonials-list">
        {testimonials.map((t, i) => (
          <div key={i} className="testimonial-card">
            {t.rating ? (
              <p className="testimonial-card-stars">
                {"★".repeat(t.rating)}
                <span className="testimonial-card-stars--dim">{"★".repeat(5 - t.rating)}</span>
              </p>
            ) : null}
            <p className="testimonial-card-body">&quot;{t.body}&quot;</p>
            {t.name ? <p className="testimonial-card-name">— {t.name}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
