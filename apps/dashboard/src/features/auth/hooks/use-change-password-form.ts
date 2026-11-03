import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { changePasswordSchema } from "../schemas";

export const useChangePasswordForm = () => {
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState<string>();

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
            setError(undefined);
            setNotice(undefined);

            const { error: changeError } = await authClient.changePassword({
                currentPassword: value.currentPassword,
                newPassword: value.password,
                revokeOtherSessions: true,
            });

            if (changeError) {
                setError(
                    changeError.message ?? "Could not update your password."
                );

                return;
            }

            form.reset();
            setNotice("Password updated. Other sessions were signed out.");
        },
    });

    return { error, form, notice };
};
