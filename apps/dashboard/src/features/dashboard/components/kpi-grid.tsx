import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { kpis } from "@/features/dashboard/data";

export const KpiGrid = () => (
    <Card>
        <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => (
                    <div className="flex flex-col gap-1" key={kpi.id}>
                        <span className="text-muted-foreground text-sm">
                            {kpi.label}
                        </span>
                        <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
                            {kpi.value}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs">
                            <span
                                className={
                                    kpi.tone === "positive"
                                        ? "text-success inline-flex items-center gap-0.5 font-medium"
                                        : "text-destructive inline-flex items-center gap-0.5 font-medium"
                                }
                            >
                                {kpi.direction === "up" ? (
                                    <ArrowUpRightIcon className="size-3" />
                                ) : (
                                    <ArrowDownRightIcon className="size-3" />
                                )}
                                {kpi.delta}
                            </span>
                            <span className="text-muted-foreground">
                                {kpi.caption}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
);
