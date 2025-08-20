**Product Requirements Document (PRD)**

**Project Title:** AI-Powered Web Accessibility Compliance SaaS

---

## **Overview**

This SaaS product audits websites for accessibility compliance (WCAG 2.1 AA / ADA), providing detailed reports and AI-powered suggestions for improving accessibility. Users can start with a free scan (1 page), and unlock more features via a paid subscription.

---

## **Target Users**

- Small to medium website owners (e.g. Shopify, WordPress, custom sites)
- Agencies managing client sites
- SaaS vendors wanting to meet accessibility standards
- Developers wanting audits + fix suggestions

---

## **Tech Stack**

- **Frontend:** Next.js (App Router)
- **UI Kit:** ShadCN (with custom styling support)
- **Backend/Auth/DB:** Supabase (Auth, PostgreSQL, Edge functions)
- **Crawler/Auditor:** Playwright + `axe-core`
- **Email Delivery:** Resend (or Supabase edge function + SMTP)
- **AI Suggestions (future):** OpenAI / Claude
- **Hosting:** Vercel
- **Payments:** Stripe (to be implemented later, mocked initially)

---

## **Core Features (MVP)**

### **Public Free Scan (no login)**

- Send scan results to email after free scan

### **Authenticated Experience**

- Mock "Pro" features using a `fakeIsProUser` flag (to simulate gated experience)

### **Admin**

- Restrict access to deeper report sections behind the paywall

---

## **Future Features (Post-MVP TODOs)**

- AI-powered fix suggestions (GPT-based prompts)
- Scheduled scans (weekly, monthly)
- Multi-page crawling / sitemap support
- Downloadable PDF reports
- Shareable public scan links
- Accessibility score history tracking
- Slack/Email issue alerts
- Stripe billing integration
- Team/Agency accounts
- White-label reports
- Browser extension

---

## **Data Model Sketch**

### `users`

- id
- email
- stripe\_customer\_id (nullable)
- plan: "free" | "pro"

### `scans`

- id
- user\_id (nullable for anonymous)
- url
- created\_at
- result\_json (raw axe-core output)
- score (computed score)

### `pages` (optional if we support multi-page projects)

- id
- user\_id
- project\_id (nullable)
- url
- metadata

---

## **Payments**

- No Stripe integration in MVP
- Pages behind paywall can be mocked with a `fakeIsProUser` flag
- Pricing tiers will be implemented later:
  - Free: 1 scan, 1 page
  - Pro: \$29–\$49/mo, 50 pages, scheduled scans, AI suggestions

---

## **Security & Compliance**

- No sensitive user data collected beyond email
- Axe-core does not interact with secure content, only public HTML
- Ensure CORS-safe server-side fetching

---

## **LLM Integration (Future)**

Use OpenAI API to:

- Interpret violations in plain language
- Generate `alt` tag suggestions
- Suggest semantic HTML fixes
- Provide fix snippets for common issues

---

## **Testing & Dev Mode Notes**

- Allow local testing of scans with mocked data
- Include test mode flag for fake payments
- Use dummy email domain or mail preview for dev (e.g. Resend dev mode)

---

## **Next Steps**

- Scaffold Next.js app with Supabase auth + DB
- Build scan queue and browser worker (Node/Playwright)
- Implement frontend scan form and report UI
- Connect email sending logic
- Build out dashboard with scan history and paywall gates

---

## **Goal**

Launch a usable MVP with:

- Free scan → email flow
- Login + dashboard
- Full-page WCAG audit output
- Clear upgrade path for monetization

