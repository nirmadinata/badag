export interface Kpi {
    id: string;
    label: string;
    value: string;
    delta: string;
    direction: "up" | "down";
    tone: "positive" | "negative";
    caption: string;
}

export const kpis: Kpi[] = [
    {
        id: "runs",
        label: "Runs today",
        value: "1,284",
        delta: "12.4%",
        direction: "up",
        tone: "positive",
        caption: "vs. yesterday",
    },
    {
        id: "success",
        label: "Success rate",
        value: "98.2%",
        delta: "0.6 pts",
        direction: "up",
        tone: "positive",
        caption: "last 24 hours",
    },
    {
        id: "dags",
        label: "Active DAGs",
        value: "24",
        delta: "3 new",
        direction: "up",
        tone: "positive",
        caption: "this week",
    },
    {
        id: "duration",
        label: "Avg. duration",
        value: "42s",
        delta: "8.1%",
        direction: "down",
        tone: "positive",
        caption: "vs. last week",
    },
];

export type RunStatus = "completed" | "running" | "failed" | "skipped";

export interface DagRun {
    id: string;
    dag: string;
    status: RunStatus;
    startedAt: string;
    duration: string;
}

export const recentRuns: DagRun[] = [
    {
        id: "run_8f2a",
        dag: "orders_pipeline",
        status: "completed",
        startedAt: "2 min ago",
        duration: "42s",
    },
    {
        id: "run_8f29",
        dag: "ingest_pipeline",
        status: "completed",
        startedAt: "8 min ago",
        duration: "1m 18s",
    },
    {
        id: "run_8f28",
        dag: "billing_sync",
        status: "failed",
        startedAt: "21 min ago",
        duration: "12s",
    },
    {
        id: "run_8f27",
        dag: "nightly_rollup",
        status: "running",
        startedAt: "26 min ago",
        duration: "26m",
    },
    {
        id: "run_8f26",
        dag: "churn_export",
        status: "skipped",
        startedAt: "40 min ago",
        duration: "—",
    },
];

export interface Violation {
    code: string;
    title: string;
    dag: string;
    severity: "error" | "warning";
    detectedAt: string;
}

export const violations: Violation[] = [
    {
        code: "unrouted_branch",
        title: "2 declared branches are unrouted",
        dag: "orders_pipeline",
        severity: "warning",
        detectedAt: "12 min ago",
    },
    {
        code: "invalid_declared_branch",
        title: "Branch name cannot be a task name",
        dag: "billing_sync",
        severity: "error",
        detectedAt: "1 hour ago",
    },
    {
        code: "self_trigger",
        title: "Self trigger can never execute",
        dag: "nightly_rollup",
        severity: "warning",
        detectedAt: "3 hours ago",
    },
];

export interface ActivityEntry {
    id: string;
    actor: string;
    initials: string;
    action: string;
    target: string;
    at: string;
}

export const activity: ActivityEntry[] = [
    {
        id: "act_1",
        actor: "Maya Chen",
        initials: "MC",
        action: "triggered",
        target: "billing_sync",
        at: "4 min ago",
    },
    {
        id: "act_2",
        actor: "Arun Patel",
        initials: "AP",
        action: "routed load → notify in",
        target: "orders_pipeline",
        at: "18 min ago",
    },
    {
        id: "act_3",
        actor: "Badag",
        initials: "BG",
        action: "passed graph audit for",
        target: "ingest_pipeline",
        at: "1 hour ago",
    },
    {
        id: "act_4",
        actor: "Nadia Rahman",
        initials: "NR",
        action: "created a sensor task in",
        target: "nightly_rollup",
        at: "2 hours ago",
    },
];
