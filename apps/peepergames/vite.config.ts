import mdx from '@mdx-js/rollup';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { reactRouterHonoServer } from 'react-router-hono-server/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
	plugins: [
		tailwindcss(),
		mdx(),
		reactRouterHonoServer({ serverEntryPoint: './src/.server/server.ts' }),
		reactRouter(),
		tsconfigPaths()
	],
	ssr: {
		noExternal: ['feature-react']
	}
});
