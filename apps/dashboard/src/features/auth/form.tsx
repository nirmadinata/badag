import {
    createFormHook,
    createFormHookContexts,
    useSelector,
} from "@tanstack/react-form";
import type { ComponentProps, ElementType } from "react";

import { PasswordField } from "./components/password-field";
import { TextField } from "./components/text-field";

const { fieldContext, formContext, useFieldContext } = createFormHookContexts();

interface ValidationIssue {
    message?: string;
}

/** Standard Schema issues arrive as objects carrying a `message`. */
const isIssue = (value: unknown): value is ValidationIssue =>
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string";

const firstError = (errors: readonly unknown[]): string | undefined =>
    errors
        .map((error) => (isIssue(error) ? error.message : undefined))
        .find(Boolean);

type FieldChrome<T extends ElementType> = Omit<
    ComponentProps<T>,
    "error" | "id" | "name" | "onBlur" | "onChange" | "value"
>;

/**
 * Shared wiring for every text-like field: value binding, blur handling, and
 * error visibility (only after blur or submit, so untouched forms stay quiet).
 */
const useFieldBinding = () => {
    const field = useFieldContext<string>();

    const submitted = useSelector(
        field.form.store,
        (state) => state.submissionAttempts > 0
    );

    return {
        error:
            submitted || field.state.meta.isBlurred
                ? firstError(field.state.meta.errors)
                : undefined,
        id: field.name,
        name: field.name,
        onBlur: () => field.handleBlur(),
        onChange: (event: { target: { value: string } }) =>
            field.handleChange(event.target.value),
        value: field.state.value,
    };
};

const FormTextField = (props: FieldChrome<typeof TextField>) => (
    <TextField {...useFieldBinding()} {...props} />
);

const FormPasswordField = (props: FieldChrome<typeof PasswordField>) => (
    <PasswordField {...useFieldBinding()} {...props} />
);

export const { useAppForm } = createFormHook({
    fieldContext,
    formContext,
    fieldComponents: {
        TextField: FormTextField,
        PasswordField: FormPasswordField,
    },
    formComponents: {},
});
