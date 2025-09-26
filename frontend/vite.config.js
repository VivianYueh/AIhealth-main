import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    server: {
        host: "", // ✅ 開放區網或公開 IP
        port: 5173, // ✅ 可自定 port
        proxy: {
            "/api": {
                target: "http://localhost:3001",
                changeOrigin: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"), // ✅ 支援 @ 當成 src
        },
    },
});
