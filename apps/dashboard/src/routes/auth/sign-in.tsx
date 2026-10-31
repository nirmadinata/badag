import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SocialAuth } from "@/features/auth/components/social-auth";
import { useAppForm } from "@/features/auth/form";
import { signInSchema } from "@/features/auth/schemas";

const SignInPage = () => {
    const form = useAppForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: signInSchema, onSubmit: signInSchema },
    });

    return (
        <AuthCard
            description="Sign in to inspect graphs, runs, and audits."
            title="Welcome back"
        >
            <SocialAuth />
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
                            <Checkbox defaultChecked id="remember" />
                            <Label htmlFor="remember">Remember me</Label>
                        </div>
                        <Link
                            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                            to="/auth/forgot-password"
                        >
                            Forgot password?
                        </Link>
                    </div>
                    <Button className="w-full" size="lg" type="submit">
                        Sign in
                    </Button>
                </FieldGroup>
            </form>
        </AuthCard>
    );
};

export const Route = createFileRoute("/auth/sign-in")({
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
