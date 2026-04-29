---
name: react-vite-patterns
description: "Build React applications with Vite for fast development and optimized builds."
---

# React + Vite

## Overview
Vite provides a fast development experience and optimized production builds for React applications. This skill should be invoked when creating modern React applications that benefit from fast hot reloading, optimized bundling, and modern development patterns.

## Core Principles
- **Fast HMR**: Hot Module Replacement for instant updates
- **Native ESM**: Uses native ES modules
- **Build Optimization**: Rollup-based production builds
- **Plugin System**: Extend with Vite plugins

## Preparation Checklist
- [ ] Initialize: `npm create vite@latest`
- [ ] Choose React variant (JavaScript or TypeScript)
- [ ] Configure vite.config.js
- [ ] Plan project structure

## Step-by-Step Process
1. **Initialize**: Create Vite + React project
2. **Configure**: Set up plugins and build options
3. **Develop**: Build components with modern patterns
4. **Route**: Add React Router if needed
5. **Build**: Run `npm run build`
6. **Preview**: Test production build locally

## Do's and Don'ts
- ✅ **Do** use TypeScript for better DX
- ✅ **Do** configure path aliases
- ✅ **Do** use environment variables
- ❌ **Don't** ignore build warnings
- ❌ **Don't** skip error boundaries
- ❌ **Don't** use .js/.jsx for new projects

## Anti-Patterns
- **No TypeScript**: Avoiding type safety
- **Large Bundles**: Not code-splitting
- **Missing Error Boundaries**: Not handling errors
- **No Environment Config**: Hardcoding values
