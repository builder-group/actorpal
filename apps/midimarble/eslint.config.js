import reactInternal from '@blgc/config/eslint/react-internal';

/**
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @type {import("eslint").Linter.Config}
 */
export default [
	...reactInternal,
	{
		ignores: ['build/**', 'dist/**', 'node_modules/**']
	}
];
