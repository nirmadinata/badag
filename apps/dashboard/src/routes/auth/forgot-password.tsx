import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, MailIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAppForm } from "@/features/auth/form";
import { forgotPasswordSchema } from "@/features/auth/schemas";

const ForgotPasswordPage = () => {
    const form = useAppForm({
        defaultValues: { email: "" },
        validators: {
            onChange: forgotPasswordSchema,
            onSubmit: forgotPasswordSchema,
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
