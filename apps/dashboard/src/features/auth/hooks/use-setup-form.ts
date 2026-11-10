import { useNavigate } from "@tanstack/react-router";

import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { setupSchema } from "../schemas";

export const useSetupForm = () => {
    const navigate = useNavigate();

    const form = useAppForm({
        defaultValues: { fullName: "", email: "", password: "" },
        validators: { onChange: setupSchema, onSubmit: setupSchema },
        onSubmit: async ({ value }) => {
            const { error: signUpError } = await authClient.signUp.email({
                email: value.email,
                name: value.fullName,
                password: value.password,
            });

            if (signUpError) {
                toast.error({
                    title: "Could not create the account",
                    description: signUpError.message,
                });

                return;
            }

            await navigate({ to: "/dashboard" });
            toast.success({
                title: "Account created",
                description: "You are signed in as the administrator.",
            });
        },
    });

    return { form };
};
