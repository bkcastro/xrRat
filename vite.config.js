import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    plugins: [wasm()],
    server: {
        host: '0.0.0.0', // Bind to all network interfaces
        https: {
            key: fs.readFileSync(path.resolve(__dirname, 'key.pem')),
            cert: fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
        }
    }
});