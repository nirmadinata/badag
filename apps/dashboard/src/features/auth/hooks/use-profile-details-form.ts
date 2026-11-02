import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";

import { useAppForm } from "../form";
import { profileSchema } from "../schemas";

export const useProfileDetailsForm = (userName: string) => {
    const router = useRouter();
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState<string>();

    const form = useAppForm({
        defaultValues: { fullName: userName },
        validators: { onChange: profileSchema, onSubmit: profileSchema },
        onSubmit: async ({ value }) => {
            setError(undefined);
            setNotice(undefined);

            const { error: updateError } = await authClient.updateUser({
                name: value.fullName,
            });

            if (updateError) {
                setError(
                    updateError.message ?? "Could not update your profile."
                );

                return;
            }

            await router.invalidate();
            setNotice("Username updated.");
        },
    });

    return { error, form, notice };
};
