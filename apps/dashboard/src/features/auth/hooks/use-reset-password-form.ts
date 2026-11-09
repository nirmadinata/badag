import { useNavigate } from "@tanstack/react-router";

import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { resetPasswordSchema } from "../schemas";

export const useResetPasswordForm = (token: string | undefined) => {
    const navigate = useNavigate();

    const form = useAppForm({
        defaultValues: { password: "", confirmPassword: "" },
        validators: {
            onChange: resetPasswordSchema,
            onSubmit: resetPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            if (!token) {
                toast.error({
                    title: "Reset link is incomplete",
                    description:
                        "Open the reset link from your email to continue.",
                });

                return;
            }

            const { error: resetError } = await authClient.resetPassword({
                newPassword: value.password,
                token,
            });

            if (resetError) {
                toast.error({
                    title: "Could not reset the password",
                    description: resetError.message,
                });

                return;
            }

            await navigate({ to: "/auth/sign-in" });
            toast.success({
                title: "Password updated",
                description: "Sign in with your new password.",
            });
        },
    });

    return { form };
};
