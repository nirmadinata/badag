import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ArrowLeftIcon,
    CheckIcon,
    CircleIcon,
    KeyRoundIcon,
} from "lucide-react";
import * as v from "valibot";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useResetPasswordForm } from "@/features/auth/hooks/use-reset-password-form";
import { PASSWORD_RULES } from "@/features/auth/schemas";

const PasswordRules = ({ password }: { password: string }) => (
    <ul className="flex flex-col gap-2">
        {PASSWORD_RULES.map((rule) => {
            const met = rule.test(password);

            return (
                <li
                    className={
                        met
                            ? "text-success flex items-center gap-2 text-xs"
                            : "text-muted-foreground flex items-center gap-2 text-xs"
                    }
                    key={rule.label}
                >
                    {met ? (
                        <CheckIcon className="size-3" />
                    ) : (
                        <CircleIcon className="size-3" />
                    )}
                    {rule.label}
                </li>
            );
        })}
    </ul>
);

const ResetPasswordPage = () => {
    const { token } = Route.useSearch();
    const { error, form } = useResetPasswordForm(token);

    return (
        <AuthCard
            description="Your new password must be different from the previous one."
            eyebrow="Almost there"
            footer={
                <Link
                    className="text-foreground inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                    to="/auth/sign-in"
                >
                    <ArrowLeftIcon className="size-3.5" />
                    Back to sign in
                </Link>
            }
            icon={<KeyRoundIcon className="size-4" />}
            title="Choose a new password"
        >
            <form
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <FieldGroup>
                    <form.AppField name="password">
                        {(field) => (
                            <>
                                <field.PasswordField
                                    autoComplete="new-password"
                                    label="New password"
                                />
                                <PasswordRules password={field.state.value} />
                            </>
                        )}
                    </form.AppField>
                    <form.AppField name="confirmPassword">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="new-password"
                                label="Confirm password"
                            />
                        )}
                    </form.AppField>
                    {token ? null : (
                        <p className="text-destructive text-sm">
                            Open the reset link from your email to continue.
                        </p>
                    )}
                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}
                    <Button className="w-full" size="lg" type="submit">
                        Update password
                    </Button>
                </FieldGroup>
            </form>
        </AuthCard>
    );
};

export const Route = createFileRoute("/auth/reset-password")({
    validateSearch: v.object({ token: v.optional(v.string()) }),
    head: () => ({
        meta: [
            { title: "Reset password · Badag" },
            {
                name: "description",
                content: "Choose a new password for your Badag account.",
            },
        ],
    }),
    component: ResetPasswordPage,
});
