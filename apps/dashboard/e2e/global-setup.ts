import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import type { ViteDevServer } from "vite";
import type { TestProject } from "vitest/node";

const host = "127.0.0.1";
const port = 3100;
const root = fileURLToPath(new URL("..", import.meta.url));

export default async function setup(project: TestProject) {
    const server: ViteDevServer = await createServer({
        root,
        logLevel: "error",
        server: { host, port, strictPort: true },
    });

    await server.listen();
    project.provide("baseUrl", `http://${host}:${port}`);

    return async () => {
        await server.close();
    };
}
