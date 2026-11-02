import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { setupSchema } from "../schemas";

export const useSetupForm = () => {
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

    return { error, form };
};
