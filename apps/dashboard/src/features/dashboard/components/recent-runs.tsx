import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { recentRuns } from "@/features/dashboard/data";

const statusStyles = {
    completed: "bg-success",
    running: "bg-warning",
    failed: "bg-destructive",
    skipped: "bg-muted-foreground",
} as const;

export const RecentRuns = () => (
    <Card>
        <CardHeader>
            <CardTitle>Recent runs</CardTitle>
            <CardDescription>
                Latest executions across your DAGs.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>DAG</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Duration</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentRuns.map((run) => (
                        <TableRow key={run.id}>
                            <TableCell>{run.dag}</TableCell>
                            <TableCell>
                                <Badge variant="outline">
                                    <span
                                        className={`size-1.5 rounded-full ${statusStyles[run.status]}`}
                                    />
                                    {run.status}
                                </Badge>
                            </TableCell>
                            <TableCell>{run.startedAt}</TableCell>
                            <TableCell>{run.duration}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);
