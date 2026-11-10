import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { changePasswordSchema } from "../schemas";

export const useChangePasswordForm = () => {
    const form = useAppForm({
        defaultValues: {
            currentPassword: "",
            password: "",
            confirmPassword: "",
        },
        validators: {
            onChange: changePasswordSchema,
            onSubmit: changePasswordSchema,
        },
        onSubmit: async ({ value }) => {
            const { error: changeError } = await authClient.changePassword({
                currentPassword: value.currentPassword,
                newPassword: value.password,
                revokeOtherSessions: true,
            });

            if (changeError) {
                toast.error({
                    title: "Could not update the password",
                    description: changeError.message,
                });

                return;
            }

            form.reset();
            toast.success({
                title: "Password updated",
                description: "Other sessions were signed out.",
            });
        },
    });

    return { form };
};
