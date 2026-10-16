// oxlint-disable anti-slop/no-unknown-returns no-unused-private-class-members

type FnType = (...args: unknown[]) => unknown;

interface CommonConfigType {
    timeout_ms?: number;
    [key: string]: unknown;
}

export interface TaskParamInput<TaskName extends string, Fn extends FnType> {
    name: TaskName;
    fn: Fn;
    config?: CommonConfigType;
}

export interface TaskParamOutput<TaskName extends string, Fn extends FnType> {
    id: string;
    name: TaskName;
    fn: Fn;
    config?: CommonConfigType;
}

export type DefineTask = <TaskName extends string, Fn extends FnType>(
    params: TaskParamInput<TaskName, Fn>
) => TaskParamOutput<TaskName, Fn>;

export const defineTask: DefineTask = (payload) => ({
    ...payload,
    id: crypto.randomUUID(),
});

/**
 * TODO: do for define DAG
 */
export class DAG {
    #name: string;

    constructor(name: string) {
        this.#name = name;
    }
}
