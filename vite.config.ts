/**
 *
 * (c) Copyright Ascensio System SIA 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import preact from "@preact/preset-vite";
import { defineConfig, loadEnv } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { fileURLToPath, URL } from "node:url";

const REQUIRED_ENV_VARS = [
  "VITE_CLIENT_ID",
  "VITE_REDIRECT_URI",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length > 0)
    throw new Error(
      `Missing required environment variables:\n  - ${missing.join(
        "\n  - "
      )}\n\n` +
        "Please set them in .env file or pass them when running the build command."
    );

  return {
    base: "./",
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@api": fileURLToPath(new URL("./src/api", import.meta.url)),
        "@components": fileURLToPath(
          new URL("./src/components", import.meta.url)
        ),
        "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
        "@hooks": fileURLToPath(new URL("./src/hooks", import.meta.url)),
        "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
        "@store": fileURLToPath(new URL("./src/store", import.meta.url)),
        "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
        "@types": fileURLToPath(new URL("./src/types", import.meta.url)),
        "@resources": fileURLToPath(new URL("./resources", import.meta.url)),
      },
    },
    plugins: [
      preact(),
      viteStaticCopy({
        targets: [
          {
            src: "resources/*",
            dest: "resources",
          },
          {
            src: "oauth.html",
            dest: ".",
          },
          {
            src: "config.json",
            dest: ".",
          },
          {
            src: "translations",
            dest: ".",
          },
        ],
      }),
    ],
  };
});
