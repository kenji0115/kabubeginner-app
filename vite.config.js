import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages のプロジェクトサイト（https://<user>.github.io/kabubeginner-app/）
// に配置するため base にリポジトリ名を指定する。
export default defineConfig({
  plugins: [react()],
  base: "/kabubeginner-app/",
});
