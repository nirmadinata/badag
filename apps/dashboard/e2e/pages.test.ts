import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

declare module "vitest" {
    interface ProvidedContext {
        baseUrl: string;
    }
}

const publicPages = [
    { path: "/auth/sign-in", heading: "Welcome back" },
    { path: "/auth/forgot-password", heading: "Forgot your password?" },
    { path: "/auth/reset-password", heading: "Choose a new password" },
] as const;

const authPaths = ["/auth/sign-in", "/auth/setup"];

const probeSetupRequired = async (page: Page, baseUrl: string) => {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => authPaths.includes(url.pathname), {
        timeout: 15_000,
    });

    return new URL(page.url()).pathname === "/auth/setup";
};

const setupRequired = async (browser: Browser, baseUrl: string) => {
    const page = await browser.newPage();

    try {
        return await probeSetupRequired(page, baseUrl);
    } finally {
        await page.close();
    }
};

describe("page visits", () => {
    let browser: Browser;
    let baseUrl: string;

    beforeAll(async () => {
        baseUrl = inject("baseUrl");
        browser = await chromium.launch();
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    it("funnels every UI route into setup before the first account exists", async () => {
        if (!(await setupRequired(browser, baseUrl))) {
            return;
        }

        const paths = [
            "/",
            "/dashboard",
            "/dashboard/activity",
            ...publicPages.map((entry) => entry.path),
        ];

        await Promise.all(
            paths.map(async (path) => {
                const page = await browser.newPage();

                try {
                    await page.goto(`${baseUrl}${path}`, {
                        waitUntil: "domcontentloaded",
                    });
                    await page.waitForURL(
                        (url) => url.pathname === "/auth/setup",
                        { timeout: 15_000 }
                    );
                    expect(new URL(page.url()).pathname).toBe("/auth/setup");
                } finally {
                    await page.close();
                }
            })
        );
    });

    it("renders public auth pages once setup is complete", async () => {
        if (await setupRequired(browser, baseUrl)) {
            return;
        }

        await Promise.all(
            publicPages.map(async ({ path, heading }) => {
                const page = await browser.newPage();

                try {
                    const response = await page.goto(`${baseUrl}${path}`, {
                        waitUntil: "domcontentloaded",
                    });

                    expect(response?.status()).toBe(200);
                    await page
                        .getByRole("heading", { name: heading })
                        .waitFor({ state: "visible" });
                } finally {
                    await page.close();
                }
            })
        );
    });

    it("sends anonymous visitors from the dashboard to auth", async () => {
        const page = await browser.newPage();

        try {
            await page.goto(`${baseUrl}/dashboard`, {
                waitUntil: "domcontentloaded",
            });

            await page.waitForURL((url) => authPaths.includes(url.pathname), {
                timeout: 15_000,
            });
            expect(authPaths).toContain(new URL(page.url()).pathname);
        } finally {
            await page.close();
        }
    });

    it("sends the root path to auth when signed out", async () => {
        const page = await browser.newPage();

        try {
            await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

            await page.waitForURL((url) => authPaths.includes(url.pathname), {
                timeout: 15_000,
            });
            expect(authPaths).toContain(new URL(page.url()).pathname);
        } finally {
            await page.close();
        }
    });
});
