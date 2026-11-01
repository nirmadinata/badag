import { chromium } from "playwright";
import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

declare module "vitest" {
    interface ProvidedContext {
        baseUrl: string;
    }
}

const pages = [
    { path: "/dashboard", heading: "Overview" },
    { path: "/dashboard/activity", heading: "Activity" },
    { path: "/auth/sign-in", heading: "Welcome back" },
    { path: "/auth/forgot-password", heading: "Forgot your password?" },
    { path: "/auth/reset-password", heading: "Choose a new password" },
    { path: "/auth/setup", heading: "Create your account" },
] as const;

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

    it.each(pages)("loads $path", async ({ path, heading }) => {
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
    });

    it("sends the root path to the dashboard", async () => {
        const page = await browser.newPage();

        try {
            await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });

            await page.waitForURL("**/dashboard");
            expect(new URL(page.url()).pathname).toBe("/dashboard");
        } finally {
            await page.close();
        }
    });
});
