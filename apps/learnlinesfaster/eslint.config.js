import reactInternal from '@blgc/config/eslint/react-internal';

/**
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @type {import("eslint").Linter.Config}
 */
export default [
	...reactInternal,
	{
		rules: {
			'react/prop-types': 'off',
			'react/no-unknown-property': ['error', { ignore: ['variant'] }]
		},
		ignores: ['build/**', 'dist/**', 'node_modules/**']
	}
];
