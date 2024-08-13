import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
    plugins: [wasm()],
    server: {
        port: 3000, // Bind to all network interfaces
    }
});