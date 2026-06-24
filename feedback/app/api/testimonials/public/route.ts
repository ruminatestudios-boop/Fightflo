import { NextResponse } from "next/server";
import { listApprovedTestimonials } from "@/lib/db/queries";

/** Public, read-only — only approved testimonials, no admin auth needed. */
export async function GET() {
  const testimonials = await listApprovedTestimonials(20);
  const safe = testimonials.map((t) => ({
    name: t.name,
    body: t.body,
    rating: t.rating,
  }));
  return NextResponse.json({ testimonials: safe });
}
