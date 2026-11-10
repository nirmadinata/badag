import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

import { useAppForm } from "../form";
import { signInSchema } from "../schemas";

export const useSignInForm = () => {
    const navigate = useNavigate();
    const [remember, setRemember] = useState(true);

    const form = useAppForm({
        defaultValues: { email: "", password: "" },
        validators: { onChange: signInSchema, onSubmit: signInSchema },
        onSubmit: async ({ value }) => {
            const { error: signInError } = await authClient.signIn.email({
                email: value.email,
                password: value.password,
                rememberMe: remember,
            });

            if (signInError) {
                toast.error({
                    title: "Could not sign in",
                    description:
                        signInError.message ?? "Check your email and password.",
                });

                return;
            }

            await navigate({ to: "/dashboard" });
            toast.success({ title: "Signed in" });
        },
    });

    return { form, remember, setRemember };
};
