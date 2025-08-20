# Accessibility SaaS Development Notes

## Tech Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS v4 (new inline theme syntax)
- TypeScript
- Geist fonts (Sans & Mono)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx (root layout)
│   ├── page.tsx (home page)
│   └── globals.css (Tailwind v4 config)
├── components/ (to be created)
├── lib/ (to be created)
└── types/ (to be created)
```

## Key Features to Implement

1. **Public Free Scan** - No login required, email results
2. **Authenticated Dashboard** - Scan history, pro features
3. **Mock Pro Features** - Use `fakeIsProUser` flag
4. **Accessibility Scanning** - Playwright + axe-core integration

## Design System

- Primary colors: Accessibility-focused (high contrast)
- Typography: Geist Sans (primary), Geist Mono (code)
- Dark/Light mode support built-in
- Mobile-first responsive design

## Current Status

- [x] Next.js 15 setup with Tailwind v4
- [x] Main layout design (header, footer, responsive)
- [x] Home page with hero section and features
- [x] Accessibility-focused design system (high contrast, focus styles)
- [x] SEO metadata and OpenGraph setup
- [x] shadcn/ui component library setup
- [x] Modular layout components (Header, Footer)
- [ ] Authentication flow
- [ ] Scanning functionality
- [ ] Dashboard implementation

## Layout Features Implemented

- **Header**: Sticky navigation with brand, main links, and auth buttons
- **Footer**: Simple footer with legal links
- **Design System**: High contrast colors, accessibility focus
- **Responsive**: Mobile-first approach with Tailwind breakpoints
- **Typography**: Geist fonts with proper font loading
- **Accessibility**: Focus styles, reduced motion support, high contrast mode
- **Components**: shadcn/ui Button, Card, Input, Label components integrated

## shadcn/ui Integration

- **Setup**: Configured with "new-york" style and neutral base color
- **Components Added**: Button, Card, Input, Label
- **Utils**: cn() utility for class merging with clsx and tailwind-merge
- **Icons**: Lucide React icon library configured
- **Aliases**: Proper path aliases configured (@/components, @/lib, etc.)
