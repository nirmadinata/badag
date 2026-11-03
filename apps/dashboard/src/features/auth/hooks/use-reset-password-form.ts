import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { resetPasswordSchema } from "../schemas";

export const useResetPasswordForm = (token: string | undefined) => {
    const navigate = useNavigate();
    const [error, setError] = useState<string>();

    const form = useAppForm({
        defaultValues: { password: "", confirmPassword: "" },
        validators: {
            onChange: resetPasswordSchema,
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            if (!token) {
                setError("This reset link is missing its token.");

                return;
            }

            setError(undefined);

            const { error: resetError } = await authClient.resetPassword({
                newPassword: value.password,
                token,
            });

            if (resetError) {
                setError(resetError.message ?? "Could not reset the password.");

                return;
            }

            await navigate({ to: "/auth/sign-in" });
        },
    });

    return { error, form };
};
