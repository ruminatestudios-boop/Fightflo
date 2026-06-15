export const LEGAL_LAST_UPDATED = "15 June 2025";

export const PRIVACY_SECTIONS = [
  {
    title: "What we collect",
    body: "When you upload a training video we process the file to extract frames and body pose landmarks. We store your email if you provide it, session metadata, coaching reports, and optional landmark data. Payment is handled by Stripe — we do not store card numbers.",
  },
  {
    title: "How we use it",
    body: "We use your footage solely to generate technical coaching reports, track progress across your sessions, and send product emails you opt into. We do not sell your data.",
  },
  {
    title: "Video retention",
    body: "Source videos may be deleted from our video host after analysis completes when DELETE_SOURCE_VIDEO_AFTER_ANALYSIS is enabled. Highlight clips and landmark data may be kept so you can replay reports.",
  },
  {
    title: "Your rights",
    body: "You can request deletion of your account data by emailing support@fightflo.app. EU/UK users may have additional rights under GDPR.",
  },
  {
    title: "Contact",
    body: "Fightflo — privacy questions: support@fightflo.app",
  },
] as const;

export const TERMS_SECTIONS = [
  {
    title: "Service",
    body: "Fightflo Feedback provides AI-assisted technical coaching from training videos. It is not medical advice and does not replace a qualified coach.",
  },
  {
    title: "Accuracy",
    body: "Analysis depends on video quality, camera angle, and visible body tracking. Results are best on bag work, pad rounds, and shadowboxing with your full body in frame.",
  },
  {
    title: "Accounts & billing",
    body: "Free tier includes a limited number of lifetime analyses. Pro subscriptions renew monthly until cancelled in Stripe. Top-up packs apply to Pro subscribers only.",
  },
  {
    title: "Acceptable use",
    body: "Do not upload illegal content or footage you do not have rights to use. You must be 16+ or have guardian consent.",
  },
  {
    title: "Liability",
    body: "The service is provided as-is. We are not liable for training injuries or competition outcomes based on AI suggestions.",
  },
  {
    title: "Contact",
    body: "Questions: support@fightflo.app",
  },
] as const;
