/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cr: {
          bg: '#0b0f17',       // Control room canvas dark
          surface: '#111827',  // Card / panel surface
          panel: '#151d2e',    // Elevated panel / modal
          subtle: '#1e293b',   // Hover / active item
          border: '#283548',   // Crisp thin border
          'border-subtle': '#1e293b',
          text: '#f8fafc',
          muted: '#94a3b8',
          dim: '#64748b',
        },
        status: {
          online: '#10b981',
          offline: '#ef4444',
          warning: '#f59e0b',
          unknown: '#94a3b8',
          stream: '#06b6d4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'crisp': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'panel': '0 4px 16px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -2px rgba(0, 0, 0, 0.3)',
        'glow-online': '0 0 12px -2px rgba(16, 185, 129, 0.35)',
        'glow-offline': '0 0 12px -2px rgba(239, 68, 68, 0.35)',
        'glow-warning': '0 0 12px -2px rgba(245, 158, 11, 0.35)',
      }
    },
  },
  plugins: [],
}
