import { constants } from "@badag/db-schema/main-db";
import { useState } from "react";

import { useAppForm } from "@/features/auth/form";
import { setupSchema } from "@/features/auth/schemas";
import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

interface UseCreateUserFormOptions {
    onCreated: () => void;
    onOpenChange: (open: boolean) => void;
}

export const useCreateUserForm = ({
    onCreated,
    onOpenChange,
}: UseCreateUserFormOptions) => {
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    const form = useAppForm({
        defaultValues: { fullName: "", email: "", password: "" },
        validators: { onChange: setupSchema, onSubmit: setupSchema },
        onSubmit: async ({ value }) => {
            const { error: createError } = await authClient.admin.createUser({
                email: value.email,
                name: value.fullName,
                password: value.password,
                role: isSuperadmin
                    ? constants.ENUM_USER_ROLE.Superadmin
                    : constants.DEFAULT_USER_ROLE,
            });

            if (createError) {
                toast.error({
                    title: "Could not create the account",
                    description: createError.message,
                });

                return;
            }

            form.reset();
            setIsSuperadmin(false);
            onOpenChange(false);
            onCreated();
            toast.success({
                title: "User created",
                description: `${value.email} can sign in with the temporary password.`,
            });
        },
    });

    return { form, isSuperadmin, setIsSuperadmin };
};
