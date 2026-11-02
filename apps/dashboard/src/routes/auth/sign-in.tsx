import {
    createFileRoute,
    Link,
    redirect,
    useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { useAppForm } from "@/features/auth/form";
import { signInSchema } from "@/features/auth/schemas";
import { authClient } from "@/integrations/better-auth/client";

const SignInPage = () => {
    const navigate = useNavigate();
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState<string>();

    const form = useAppForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: signInSchema, onSubmit: signInSchema },
        onSubmit: async ({ value }) => {
            setError(undefined);

            const { error: signInError } = await authClient.signIn.email({
                email: value.email,
                password: value.password,
                rememberMe: remember,
            });

            if (signInError) {
                setError(signInError.message ?? "Could not sign in.");

                return;
            }

            await navigate({ to: "/dashboard" });
        },
    });

    return (
        <AuthCard
            description="Sign in to inspect graphs, runs, and audits."
            title="Welcome back"
        >
            <form
                className="mt-5"
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
                    <form.AppField name="password">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="current-password"
                                label="Password"
                            />
                        )}
                    </form.AppField>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={remember}
                                id="remember"
                                onCheckedChange={(checked) =>
                                    setRemember(checked === true)
                                }
                            />
                            <Label htmlFor="remember">Remember me</Label>
                        </div>
                        <Link
                            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                            to="/auth/forgot-password"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                    ) : null}
                    <Button className="w-full" size="lg" type="submit">
                        Sign in
                    </Button>
                </FieldGroup>
            </form>
        </AuthCard>
    );
};

export const Route = createFileRoute("/auth/sign-in")({
    beforeLoad: ({ context }) => {
        if (context.authState.user) {
            throw redirect({ to: "/dashboard" });
        }
    },
    head: () => ({
        meta: [
            { title: "Sign in · Badag" },
            {
                name: "description",
                content:
                    "Sign in to Badag to inspect DAGs, runs, and graph audits.",
            },
        ],
    }),
    component: SignInPage,
});
