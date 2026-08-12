const reactConfig = require('@blgc/config/eslint/react');

module.exports = [
	...reactConfig,
	{
		ignores: ['.expo/**', 'dist/**']
	}
];
