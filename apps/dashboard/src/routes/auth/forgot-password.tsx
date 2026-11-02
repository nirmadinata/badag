import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, MailIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAppForm } from "@/features/auth/form";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import { authClient } from "@/integrations/better-auth/client";

const ForgotPasswordPage = () => {
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string>();

    const form = useAppForm({
        defaultValues: { email: "" },
        validators: {
            onChange: forgotPasswordSchema,
            onSubmit: forgotPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            setError(undefined);

            const { error: requestError } =
                await authClient.requestPasswordReset({
                    email: value.email,
                    redirectTo: "/auth/reset-password",
                });

            if (requestError) {
                setError(
                    requestError.message ??
                        "Could not send the reset instructions."
                );

                return;
            }

            setSent(true);
        },
    });

    return (
        <AuthCard
            description="Enter your account email and we will send a reset link."
            eyebrow="Password reset"
            footer={
                <Link
                    className="text-foreground inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                    to="/auth/sign-in"
                >
                    <ArrowLeftIcon className="size-3.5" />
                    Back to sign in
                </Link>
            }
            icon={<MailIcon className="size-4" />}
            title="Forgot your password?"
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
                    <form.AppField name="email">
                        {(field) => (
                            <field.TextField
                                autoComplete="email"
                                label="Email"
                                placeholder="you@company.com"
                                type="email"
                            />
                        )}
                    </form.AppField>
                    {sent ? (
                        <p className="text-muted-foreground text-sm">
                            If that email matches an account, reset instructions
                            are on their way.
                        </p>
                    ) : null}
                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}
                    <Button className="w-full" size="lg" type="submit">
                        Send reset link
                    </Button>
                </FieldGroup>
            </form>
            <p className="text-muted-foreground mt-4 text-xs">
                The link expires in 30 minutes. Check your spam folder if it
                does not arrive.
            </p>
        </AuthCard>
    );
};

export const Route = createFileRoute("/auth/forgot-password")({
    head: () => ({
        meta: [
            { title: "Forgot password · Badag" },
            {
                name: "description",
                content:
                    "Request a password reset link for your Badag account.",
            },
        ],
    }),
    component: ForgotPasswordPage,
});
