import {
    createFileRoute,
    Link,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { InfoIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAppForm } from "@/features/auth/form";
import { setupSchema } from "@/features/auth/schemas";
import { authClient } from "@/integrations/better-auth/client";

const SetupPage: React.FC = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>();

    const form = useAppForm({
        defaultValues: { fullName: "", email: "", password: "" },
        validators: { onChange: setupSchema, onSubmit: setupSchema },
        onSubmit: async ({ value }) => {
            setError(undefined);

            const { error: signUpError } = await authClient.signUp.email({
                email: value.email,
                name: value.fullName,
                password: value.password,
            });

            if (signUpError) {
                setError(
                    signUpError.message ?? "Could not create the account."
                );

                return;
            }

            await navigate({ to: "/dashboard" });
        },
    });

    return (
        <AuthCard
            description="Create the administrator account. Other accounts are created from it later."
            eyebrow="First run"
            footer={
                <p>
                    Already have an account?{" "}
                    <Link
                        className="text-foreground font-medium underline-offset-4 hover:underline"
                        to="/auth/sign-in"
                    >
                        Sign in
                    </Link>
                </p>
            }
            icon={<UserPlusIcon className="size-4" />}
            title="Create your account"
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
                    <form.AppField name="fullName">
                        {(field) => (
                            <field.TextField
                                autoComplete="name"
                                label="Full name"
                                placeholder="Nadia Rahman"
                            />
                        )}
                    </form.AppField>
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
                    <form.AppField name="password">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="new-password"
                                description="At least 8 characters. You can change it later."
                                label="Password"
                            />
                        )}
                    </form.AppField>
                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}
                    <Button className="w-full" size="lg" type="submit">
                        Create account
                    </Button>
                </FieldGroup>
            </form>
            <div className="bg-muted/40 text-muted-foreground mt-5 flex gap-2.5 rounded-lg border p-3 text-xs">
                <InfoIcon className="size-4 shrink-0" />
                <p className="text-pretty">
                    This account becomes the administrator. Every other account
                    is created from here once setup is complete.
                </p>
            </div>
            <p className="text-muted-foreground mt-4 text-xs text-pretty">
                By creating an account you agree to the Badag terms of service
                and privacy policy.
            </p>
        </AuthCard>
    );
};

export const Route = createFileRoute("/auth/setup")({
    beforeLoad: ({ context }) => {
        const { setupRequired, user } = context.authState;

        if (user) {
            throw redirect({ to: "/dashboard" });
        }

        if (!setupRequired) {
            throw redirect({ to: "/auth/sign-in" });
        }
    },
    head: () => ({
        meta: [
            { title: "Create your account · Badag" },
            {
                name: "description",
                content: "Create the first account on Badag.",
            },
        ],
    }),
    component: SetupPage,
});
