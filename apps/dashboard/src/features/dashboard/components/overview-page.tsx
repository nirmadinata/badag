import { BookOpenIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOCS_URL } from "@/lib/site";

import { GraphAudit } from "./graph-audit";
import { KpiGrid } from "./kpi-grid";
import { RecentRuns } from "./recent-runs";

export const OverviewPage = () => (
    <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
                What happened across your graphs today.
            </p>
            <div className="flex items-center gap-2">
                <Button
                    nativeButton={false}
                    render={
                        <a
                            aria-label="Documentation"
                            href={DOCS_URL}
                            rel="noreferrer"
                            target="_blank"
                        />
                    }
                    variant="outline"
                >
                    <BookOpenIcon data-icon="inline-start" />
                    Docs
                </Button>
                <Button>
                    <PlusIcon data-icon="inline-start" />
                    New DAG
                </Button>
            </div>
        </div>
        <KpiGrid />
        <div className="grid gap-4 xl:grid-cols-3">
            <div className="min-w-0 xl:col-span-2">
                <RecentRuns />
            </div>
            <GraphAudit />
        </div>
    </div>
);
