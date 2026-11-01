import { GitBranchIcon, ShieldCheckIcon, TimerIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const features = [
    {
        icon: GitBranchIcon,
        title: "Graphs you can audit",
        description:
            "Declaration is validated before execution, so unrouted branches never reach a scheduler.",
    },
    {
        icon: ShieldCheckIcon,
        title: "Identity that holds",
        description:
            "Task IDs are derived from names and behavior, keeping declarations stable across builds.",
    },
    {
        icon: TimerIcon,
        title: "Runtime, decoupled",
        description:
            "Badag declares the graph. Execution state lives with the runtime you already trust.",
    },
];

const nodes = [
    {
        x: 24,
        y: 40,
        label: "extract",
        kind: "callback",
        tone: "fill-success",
    },
    {
        x: 198,
        y: 40,
        label: "transform",
        kind: "callback",
        tone: "fill-warning",
    },
    {
        x: 372,
        y: 40,
        label: "load",
        kind: "trigger",
        tone: "fill-muted-foreground",
    },
    {
        x: 198,
        y: 188,
        label: "notify",
        kind: "branch",
        tone: "fill-border",
    },
];

const DagPreview = () => (
    <div className="bg-background/60 overflow-hidden rounded-2xl border">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-success size-1.5 rounded-full" />
                orders_pipeline
            </div>
            <span className="text-muted-foreground text-xs">4 tasks</span>
        </div>
        <svg aria-hidden="true" className="w-full" viewBox="0 0 520 268">
            <g
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-border"
            >
                <path d="M148 66h50" />
                <path d="M322 66h50" />
                <path d="M260 92v96" />
            </g>
            {nodes.map((node) => (
                <g key={node.label}>
                    <rect
                        className="fill-card stroke-border"
                        height="52"
                        rx="12"
                        strokeWidth="1"
                        width="124"
                        x={node.x}
                        y={node.y}
                    />
                    <text
                        className="fill-foreground"
                        fontSize="13"
                        fontWeight="500"
                        x={node.x + 14}
                        y={node.y + 22}
                    >
                        {node.label}
                    </text>
                    <text
                        className="fill-muted-foreground"
                        fontSize="10"
                        x={node.x + 14}
                        y={node.y + 38}
                    >
                        {node.kind}
                    </text>
                    <circle
                        className={node.tone}
                        cx={node.x + 108}
                        cy={node.y + 18}
                        r="4"
                    />
                </g>
            ))}
        </svg>
    </div>
);

export const AuthShowcase = () => (
    <aside className="bg-card relative hidden flex-col justify-between overflow-hidden rounded-3xl border p-8 lg:flex">
        <div
            aria-hidden="true"
            className="from-muted/70 via-background to-background pointer-events-none absolute inset-0 bg-linear-to-br"
        />
        <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-4">
                <Badge variant="outline">Built for engineers</Badge>
                <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance">
                    Wire the graph once. Run it anywhere.
                </h2>
                <p className="text-muted-foreground max-w-md text-sm text-pretty">
                    A small, typed SDK for declaring DAGs, wiring dependencies,
                    and auditing structure — before the scheduler ever sees a
                    task.
                </p>
            </div>
            <DagPreview />
        </div>
        <ul className="relative mt-8 flex flex-col gap-5">
            {features.map((feature) => (
                <li className="flex gap-3" key={feature.title}>
                    <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border">
                        <feature.icon className="size-4" />
                    </span>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-medium">{feature.title}</p>
                        <p className="text-muted-foreground text-sm text-pretty">
                            {feature.description}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    </aside>
);
