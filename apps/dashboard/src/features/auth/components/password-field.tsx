import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";

import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";

interface PasswordFieldProps extends Omit<
    ComponentProps<typeof InputGroupInput>,
    "type"
> {
    id: string;
    label: string;
    description?: string;
    error?: string;
}

export const PasswordField = ({
    id,
    label,
    description,
    error,
    placeholder = "••••••••",
    ...props
}: PasswordFieldProps) => {
    const [visible, setVisible] = useState(false);

    return (
        <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <InputGroup>
                <InputGroupInput
                    aria-invalid={error ? true : undefined}
                    id={id}
                    placeholder={placeholder}
                    type={visible ? "text" : "password"}
                    {...props}
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        aria-label={visible ? "Hide password" : "Show password"}
                        onClick={() => setVisible((value) => !value)}
                        size="icon-xs"
                    >
                        {visible ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
            {description ? (
                <FieldDescription>{description}</FieldDescription>
            ) : null}
            <FieldError>{error}</FieldError>
        </Field>
    );
};
