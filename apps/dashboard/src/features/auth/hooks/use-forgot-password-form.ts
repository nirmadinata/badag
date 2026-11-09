import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { forgotPasswordSchema } from "../schemas";

export const useForgotPasswordForm = () => {
    const form = useAppForm({
        defaultValues: { email: "" },
        validators: {
            onChange: forgotPasswordSchema,
            onSubmit: forgotPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            const { error: requestError } =
                await authClient.requestPasswordReset({
                    email: value.email,
                    redirectTo: "/auth/reset-password",
                });

            if (requestError) {
                toast.error({
                    title: "Could not send the reset instructions",
                    description: requestError.message,
                });

                return;
            }

            toast.success({
                title: "Reset instructions sent",
                description:
                    "If that email matches an account, the link is on its way.",
            });
        },
    });

    return { form };
};
