import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		include: ['@supabase/supabase-js', '@supabase/ssr', 'lucide-svelte'],
	},
	server: {
		port: 3000,
		host: true,
	},
	build: {
		sourcemap: true,
	},
});
