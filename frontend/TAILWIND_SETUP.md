# Tailwind CSS Setup

This project uses **Tailwind CSS v4** with the latest features and configuration.

## What's Installed

- **Tailwind CSS v4.1.11** - Latest version with new syntax
- **PostCSS v8.5.6** - CSS processing
- **Autoprefixer v10.4.21** - Vendor prefixing
- **@tailwindcss/postcss** - PostCSS plugin for Tailwind v4

## Configuration Files

### `tailwind.config.js`
- Custom color palette with primary and secondary colors
- Custom animations (fade-in, slide-up, bounce-gentle)
- Inter font family configuration
- Content paths for all React components

### `postcss.config.js`
- Configured to use `@tailwindcss/postcss` plugin
- Autoprefixer for browser compatibility

### `src/index.css`
- Tailwind CSS v4 import syntax
- Custom theme variables using `@theme` directive
- Custom component classes for buttons, inputs, cards, and chat bubbles
- Custom animations and keyframes
- Dark mode support

## Custom Components

### Buttons
- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary action buttons

### Form Elements
- `.input-field` - Styled input fields with focus states

### Layout
- `.card` - Card containers with shadow and border
- `.chat-bubble` - Chat message containers
- `.chat-bubble-sent` - Sent message styling
- `.chat-bubble-received` - Received message styling

### Animations
- `.animate-fade-in` - Fade in animation
- `.animate-slide-up` - Slide up animation
- `.animate-bounce-gentle` - Gentle bounce animation

## Usage

The chat application demonstrates the use of:
- Responsive design with Tailwind classes
- Dark mode support
- Custom color palette
- Modern UI components
- Smooth animations

## Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```

## Features

- ✅ Latest Tailwind CSS v4
- ✅ Custom color palette
- ✅ Dark mode support
- ✅ Custom animations
- ✅ Responsive design
- ✅ Modern chat interface
- ✅ PostCSS processing
- ✅ Autoprefixer
- ✅ Google Fonts integration 