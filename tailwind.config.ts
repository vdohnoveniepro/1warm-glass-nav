import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
        // Custom warm colors
        indigo: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        pink: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
          700: '#BE185D',
          800: '#9D174D',
          900: '#831843',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.7)',
          medium: 'rgba(255, 255, 255, 0.5)',
          dark: 'rgba(0, 0, 0, 0.05)',
        },
        warmbeige: {
          50: '#FDF8F3',
          100: '#F9EFE6',
          200: '#F2DFCC',
          300: '#EBCFB2',
          400: '#E4BF99',
          500: '#DDAF7F',
          600: '#D6A066',
          700: '#CF904C',
          800: '#C88033',
          900: '#C17019',
        },
        warmpeach: {
          50: '#FFF6F4',
          100: '#FFE9E4',
          200: '#FFD3C9',
          300: '#FFBDAF',
          400: '#FFA794',
          500: '#FF9179',
          600: '#FF7B5F',
          700: '#FF6544',
          800: '#FF4F2A',
          900: '#FF390F',
        },
        warmgray: {
          50: '#F9F8F7',
          100: '#F0EEEC',
          200: '#E2DED9',
          300: '#D3CEC6',
          400: '#C5BFB3',
          500: '#B6AFA0',
          600: '#A89F8D',
          700: '#998F7A',
          800: '#8B8068',
          900: '#7C7055',
        },
        teal: {
          50: '#EFFAF5',
          100: '#D6F5E8',
          200: '#ADEBD0',
          300: '#84E1B9',
          400: '#5BD7A1',
          500: '#32CD8A',
          600: '#29A46E',
          700: '#207B53',
          800: '#165237',
          900: '#0D291C',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#783602',
        },
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'glow': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(99, 102, 241, 0.6), 0 0 10px rgba(99, 102, 241, 0.4)'
          },
          '50%': {
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.8), 0 0 20px rgba(99, 102, 241, 0.6)'
          },
        },
        'slide-in': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'slide-in': 'slide-in 0.6s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
			},
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3OLi4ubm5uVlZWPj4+NjY19fX2JiYl/f39ra2uRkZGZmZlpaWmXl5dvb29xcXGTk5NnZ2c4xm1wAAABwklEQVR4Ae3RR0JyQRSE4QACKogRFXP/g9rdTZ5v1HQ/3vcD1Psk9P4B5PzB8uXLly9fv5QGYv+3y85MbGdrX3sHcvDHXr4AAAQujh/D3Gis9n5HJAsAxyAIIggAAAQBwARAJwBCEgwSQCfgAIQQs+l0xfz83ERn5xcXl9dLzfLm9g4YXx6B8ewfR89vzAcvb+8fH5/nkPn6/mH+Rz9wARU/8d9u4ODZj41FbxMXtwDlv+Hy7uHxKWjZsOOyNVH6GBaByvT1FJSZlXN3FxvwXaSfQAL0ImlmCkAtUJxVp1MCuE37DQAsAuXnYwQIAMCGmkRXKE3XKXEAWFcW5vCp8q/Y5KlzrjzYZB4KjgNALUIq3npNmRdZxrADUF8Lgd4yS4YobUVRhWkmUwKQgnJRXRSVMqm5U8pEhpqUX0wyyQKVdVCt1syDYVHfzWYz02TLBsmDfoFn/2R/P7YoIiG5eLH0lDJ7eSkQ4uJDZ46usHIVeCq646aLWvV6pQoAx+pTa6RW1oArIo0tgLIYYQPkQA70AFzCiAV4XKgA4OQQRiziX1JHaSOAvt7KfuHLly9f/wP0Bdu9L8eD5QvPAAAAAElFTkSuQmCC')",
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;