/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TVN Primärfarben
        'tvn-gold': '#E8A33D',
        'tvn-navy': '#10203B',
        'tvn-navy-dark': '#0B1626',
        'tvn-beige': '#F6F4EF',
        'tvn-beige-border': '#E1DCCF',
        'tvn-text': '#171512',
        'tvn-muted': '#71695C',
        'tvn-favorite': '#FFD700',
        
        // Altersgruppen-Farben
        'age-u10': '#3B82F6',
        'age-u14': '#10B981',
        'age-u18': '#8B5CF6',
        'age-herren': '#E8A33D',
      },
      fontFamily: {
        'heading': ['Oswald', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0,0,0,0.04)',
        'card-hover': '0 12px 30px rgba(11,22,38,0.35)',
        'favorite-glow': '0 0 30px rgba(255,215,0,0.35)',
      },
      borderRadius: {
        'card': '14px',
        'input': '10px',
        'button': '6px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'bounce-heart': 'bounceHeart 0.9s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceHeart: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 30px rgba(255,215,0,0.35)' },
          '50%': { boxShadow: '0 0 60px rgba(255,215,0,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
