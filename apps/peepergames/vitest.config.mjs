import { nodeConfig } from '@blgc/config/vite/node';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	nodeConfig,
	defineConfig({
		test: {
			setupFiles: ['./vitest.env.js'],
			testTimeout: 3600000 // 1 hour timeout
		}
	})
);
