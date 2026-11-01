import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { activity } from "@/features/dashboard/data";

export const ActivityPage = () => (
    <Card>
        <CardHeader>
            <CardTitle>Team activity</CardTitle>
            <CardDescription>What changed today.</CardDescription>
        </CardHeader>
        <CardContent>
            <ol className="flex flex-col gap-4">
                {activity.map((entry) => (
                    <li className="flex gap-3" key={entry.id}>
                        <Avatar size="sm">
                            <AvatarFallback>{entry.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-1 flex-col gap-0.5">
                            <p className="text-sm text-pretty">
                                <span className="font-medium">
                                    {entry.actor}
                                </span>{" "}
                                {entry.action}{" "}
                                <span className="font-medium">
                                    {entry.target}
                                </span>
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {entry.at}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </CardContent>
    </Card>
);
