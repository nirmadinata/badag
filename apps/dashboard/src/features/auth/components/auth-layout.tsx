import { Outlet } from "@tanstack/react-router";

import { SiteHeader } from "@/components/site-header";
import { DOCS_URL, GITHUB_URL } from "@/lib/site";

import { AuthShowcase } from "./auth-showcase";

const footerLinks = [
    { label: "Documentation", href: DOCS_URL },
    { label: "Changelog", href: `${GITHUB_URL}/releases` },
    { label: "License", href: `${GITHUB_URL}/blob/main/LICENSE` },
];

export const AuthLayout = () => (
    <div className="bg-background relative flex min-h-svh flex-col">
        <div
            aria-hidden="true"
            className="from-muted/60 pointer-events-none absolute inset-x-0 top-0 h-96 bg-linear-to-b to-transparent"
        />
        <SiteHeader />
        <main className="relative mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-6 py-10 lg:grid-cols-2 lg:gap-20 lg:py-16">
            <div className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 mx-auto w-full max-w-sm motion-safe:duration-500">
                <Outlet />
            </div>
            <AuthShowcase />
        </main>
        <footer className="bg-background/60 relative border-t">
            <div className="text-muted-foreground mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs sm:flex-row">
                <p>Badag — declare graphs, not infrastructure.</p>
                <nav className="flex items-center gap-4">
                    {footerLinks.map((link) => (
                        <a
                            className="hover:text-foreground transition-colors"
                            href={link.href}
                            key={link.label}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>
            </div>
        </footer>
    </div>
);
