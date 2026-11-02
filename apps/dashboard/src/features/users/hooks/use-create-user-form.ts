import { useState } from "react";

import { useAppForm } from "@/features/auth/form";
import { setupSchema } from "@/features/auth/schemas";
import { authClient } from "@/integrations/better-auth/client";

interface UseCreateUserFormOptions {
    onCreated: () => void;
    onOpenChange: (open: boolean) => void;
}

export const useCreateUserForm = ({
    onCreated,
    onOpenChange,
}: UseCreateUserFormOptions) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState<string>();

    const form = useAppForm({
        defaultValues: { fullName: "", email: "", password: "" },
        validators: { onChange: setupSchema, onSubmit: setupSchema },
        onSubmit: async ({ value }) => {
            setError(undefined);

            const { error: createError } = await authClient.admin.createUser({
                email: value.email,
                name: value.fullName,
                password: value.password,
                role: isAdmin ? "admin" : "user",
            });

            if (createError) {
                setError(
                    createError.message ?? "Could not create the account."
                );

                return;
            }

            form.reset();
            setIsAdmin(false);
            onOpenChange(false);
            onCreated();
        },
    });

    return { error, form, isAdmin, setIsAdmin };
};
