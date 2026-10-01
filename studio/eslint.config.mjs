import sanityConfig from '@sanity/eslint-config-studio';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

export default [
	{
		ignores: ['dist/**', '.sanity/**'],
	},

	...sanityConfig,

	// Keep imports deterministic (mirrors frontend)
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'simple-import-sort/imports': 'warn',
			'simple-import-sort/exports': 'warn',
		},
	},
];
