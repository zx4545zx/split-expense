# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Split Expense (หารค่าใช้จ่าย) is a Thai-language PWA for splitting expenses with friends - dining, travel, accommodation costs. Built with SvelteKit 5 + Supabase.

## Commands

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Build for production
npm run preview  # Preview production build
npm run check    # Run svelte-check (TypeScript validation)
npm run check:watch  # Watch mode for type checking
```

## Environment Setup

Copy `.env.example` to `.env` and configure Supabase credentials:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Database schema includes: `groups`, `group_members`, `bills`, `bill_splits` tables.

## Architecture

- **$lib alias**: Points to `./src/lib` for reusable components, stores, and utilities
- **Routes**: Follow SvelteKit file-based routing in `src/routes/`
- **State Management**: Uses Svelte stores (`src/lib/stores.ts`)
- **Database**: Supabase client in `src/lib/supabase.ts`
- **PWA**: Service worker at `src/service-worker.ts` enables offline support
