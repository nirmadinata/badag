import type { ComponentProps, ReactNode } from "react";

import {
    Field,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextFieldProps extends ComponentProps<typeof Input> {
    id: string;
    label: string;
    description?: ReactNode;
    error?: string;
}

export const TextField = ({
    id,
    label,
    description,
    error,
    ...props
}: TextFieldProps) => (
    <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input aria-invalid={error ? true : undefined} id={id} {...props} />
        {description ? (
            <FieldDescription>{description}</FieldDescription>
        ) : null}
        <FieldError>{error}</FieldError>
    </Field>
);
