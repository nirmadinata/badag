import * as v from "valibot";

const MIN_PASSWORD_LENGTH = 8;
const HAS_UPPERCASE = /[A-Z]/u;
const HAS_NUMBER_OR_SYMBOL = /[0-9]|[^A-Za-z0-9]/u;

const emailSchema = v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Enter your email address."),
    v.email("Enter a valid email address.")
);

const nameSchema = v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Enter your full name.")
);

const passwordSchema = v.pipe(
    v.string(),
    v.minLength(
        MIN_PASSWORD_LENGTH,
        `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    ),
    v.regex(HAS_UPPERCASE, "Add at least one uppercase letter."),
    v.regex(HAS_NUMBER_OR_SYMBOL, "Add at least one number or symbol.")
);

const currentPasswordSchema = v.pipe(
    v.string(),
    v.nonEmpty("Enter your password.")
);

const confirmPasswordSchema = v.pipe(
    v.string(),
    v.nonEmpty("Confirm your new password.")
);

export const PASSWORD_RULES = [
    {
        label: "At least 8 characters",
        test: (value: string) => value.length >= MIN_PASSWORD_LENGTH,
    },
    {
        label: "One uppercase letter",
        test: (value: string) => HAS_UPPERCASE.test(value),
    },
    {
        label: "One number or symbol",
        test: (value: string) => HAS_NUMBER_OR_SYMBOL.test(value),
    },
] as const;

export const signInSchema = v.object({
    email: emailSchema,
    password: currentPasswordSchema,
});

export const forgotPasswordSchema = v.object({
    email: emailSchema,
});

export const resetPasswordSchema = v.pipe(
    v.object({
        password: passwordSchema,
        confirmPassword: confirmPasswordSchema,
    }),
    v.forward(
        v.partialCheck(
            [["password"], ["confirmPassword"]],
            (input) => input.password === input.confirmPassword,
            "Passwords do not match."
        ),
        ["confirmPassword"]
    )
);

export const setupSchema = v.object({
    fullName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
});
