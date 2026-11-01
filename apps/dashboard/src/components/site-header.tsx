import { Link, useMatchRoute } from "@tanstack/react-router";

import { Brand } from "@/components/brand";
import { GithubIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { DOCS_URL, GITHUB_URL } from "@/lib/site";

export const SiteHeader = () => {
    const matchRoute = useMatchRoute();
    const onSignInPage = matchRoute({ to: "/auth/sign-in" });

    return (
        <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 border-b backdrop-blur">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-6">
                <Brand />
                <span className="text-muted-foreground hidden rounded-full border px-2 py-0.5 text-xs sm:inline">
                    DAG SDK
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <Button
                        nativeButton={false}
                        render={
                            <a
                                aria-label="Documentation"
                                href={DOCS_URL}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                        size="sm"
                        variant="ghost"
                    >
                        Docs
                    </Button>
                    <Button
                        aria-label="Badag on GitHub"
                        nativeButton={false}
                        render={
                            <a
                                aria-label="Badag on GitHub"
                                href={GITHUB_URL}
                                rel="noopener noreferrer"
                                target="_blank"
                            />
                        }
                        size="icon-sm"
                        variant="ghost"
                    >
                        <GithubIcon />
                    </Button>
                    {onSignInPage ? null : (
                        <>
                            <div className="bg-border mx-1 h-5 w-px" />
                            <Button
                                nativeButton={false}
                                render={<Link to="/auth/sign-in" />}
                                size="sm"
                                variant="outline"
                            >
                                Sign in
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
