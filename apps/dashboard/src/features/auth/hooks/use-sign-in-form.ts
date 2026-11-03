import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { signInSchema } from "../schemas";

export const useSignInForm = () => {
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

    return { error, form, remember, setRemember };
};
