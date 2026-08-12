import reactConfig from '@blgc/config/eslint/react';

/**
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 * @type {import("eslint").Linter.Config}
 */
export default [
	...reactConfig,
	{
		ignores: ['.react-router/**', 'build/**', 'dist/**', 'node_modules/**']
	}
];
