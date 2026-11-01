import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { violations } from "@/features/dashboard/data";

export const GraphAudit = () => (
    <Card>
        <CardHeader>
            <CardTitle>Graph audit</CardTitle>
            <CardDescription>Findings from the last pass.</CardDescription>
            <CardAction>
                <Badge variant="outline">{violations.length} open</Badge>
            </CardAction>
        </CardHeader>
        <CardContent>
            <ul className="flex flex-col gap-4">
                {violations.map((violation) => (
                    <li
                        className="flex flex-col gap-1"
                        key={`${violation.dag}-${violation.code}`}
                    >
                        <p className="text-sm font-medium text-pretty">
                            {violation.title}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <span
                                className={
                                    violation.severity === "error"
                                        ? "bg-destructive size-1.5 rounded-full"
                                        : "bg-warning size-1.5 rounded-full"
                                }
                            />
                            <span className="font-mono">{violation.code}</span>
                            <span aria-hidden="true">·</span>
                            {violation.dag}
                            <span aria-hidden="true">·</span>
                            {violation.detectedAt}
                        </p>
                    </li>
                ))}
            </ul>
        </CardContent>
    </Card>
);
