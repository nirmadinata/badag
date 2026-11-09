import { useRouter } from "@tanstack/react-router";

import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { profileSchema } from "../schemas";

export const useProfileDetailsForm = (userName: string) => {
    const router = useRouter();

    const form = useAppForm({
        defaultValues: { fullName: userName },
        validators: { onChange: profileSchema, onSubmit: profileSchema },
        onSubmit: async ({ value }) => {
            const { error: updateError } = await authClient.updateUser({
                name: value.fullName,
            });

            if (updateError) {
                toast.error({
                    title: "Could not update your profile",
                    description: updateError.message,
                });

                return;
            }

            await router.invalidate();
            toast.success({ title: "Username updated" });
        },
    });

    return { form };
};
