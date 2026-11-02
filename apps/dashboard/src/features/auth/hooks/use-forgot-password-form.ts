import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { forgotPasswordSchema } from "../schemas";

export const useForgotPasswordForm = () => {
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

    return { error, form, sent };
};
