export const site = {
  name: "DeepFund India",
  tagline: "Funding data for India's science-heavy startups",
  description:
    "A searchable database of Indian deeptech and healthtech funding — equity rounds and government grants — with a short technical note on every deal.",
  // Set when a domain is purchased; used for canonical URLs and the sitemap.
  url: process.env.NEXT_PUBLIC_SITE_URL || "",
  // Newsletter signup link (Beehiiv or Buttondown). Empty until the newsletter exists.
  newsletterUrl: process.env.NEXT_PUBLIC_NEWSLETTER_URL || "",
  contactEmail: "",
  // Free visitors see this many rows of full history before the Pro teaser.
  // The paywall itself arrives with Supabase auth + Razorpay; until then everything is visible.
  paywallEnabled: false,
};
