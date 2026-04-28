module.exports = {
	plugins: {
		// Process @import BEFORE Tailwind - inlines imported CSS
		"postcss-import": {},
		tailwindcss: {
      content: [
        './src/**/*.{js,ts,jsx,tsx}',
        './src/pages/**/*.{js,ts,jsx,tsx}',
        './src/components/**/*.{js,ts,jsx,tsx}',
        './src/app/**/*.{js,ts,jsx,tsx}',
        './src/checkout/**/*.{js,ts,jsx,tsx}',
      ],
      safelist: [
        // Add dynamic classes that cannot be detected statically
      ],
      corePlugins: {
        preflight: true,
      },
    },
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeUnicode: false,
        }],
      },
    }),
	},
};
