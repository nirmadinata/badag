import { chromium } from "playwright";
import type { Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

declare module "vitest" {
    interface ProvidedContext {
        baseUrl: string;
    }
}

describe("app pages", () => {
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

    it("serves the dashboard overview at the root", async () => {
        const page = await browser.newPage();

        try {
            const response = await page.goto(`${baseUrl}/`, {
                waitUntil: "domcontentloaded",
            });

            expect(response?.status()).toBe(200);
            await page
                .getByRole("heading", { name: "Overview" })
                .waitFor({ state: "visible" });
            await page
                .getByText("What happened across your graphs today.")
                .waitFor({ state: "visible" });
            await expect(
                page.getByRole("link", { name: "Sign in" }).count()
            ).resolves.toBe(0);
        } finally {
            await page.close();
        }
    });

    it("serves activity at /activity", async () => {
        const page = await browser.newPage();

        try {
            const response = await page.goto(`${baseUrl}/activity`, {
                waitUntil: "domcontentloaded",
            });

            expect(response?.status()).toBe(200);
            await page
                .getByRole("heading", { name: "Activity" })
                .waitFor({ state: "visible" });
            await page.getByText("Team activity").waitFor({ state: "visible" });
        } finally {
            await page.close();
        }
    });

    it("serves the public API health check without credentials", async () => {
        const response = await fetch(`${baseUrl}/api/v1/health`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toStrictEqual({ status: "ok" });
    });
});
