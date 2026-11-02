import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { UserAvatar } from "@/components/user-avatar";

import { useChangePasswordForm } from "../hooks/use-change-password-form";
import { useProfileDetailsForm } from "../hooks/use-profile-details-form";

interface ProfileUser {
    name: string;
    email: string;
    image?: string | null;
    role?: string | null;
}

const ProfileDetailsForm = ({ user }: { user: ProfileUser }) => {
    const { error, form, notice } = useProfileDetailsForm(user.name);

    return (
        <form
            className="mt-4 border-t pt-4"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            <FieldGroup>
                <form.AppField name="fullName">
                    {(field) => (
                        <field.TextField
                            autoComplete="name"
                            description="Shown in the navbar and user lists."
                            label="Username"
                        />
                    )}
                </form.AppField>
                {error ? (
                    <p className="text-destructive text-sm" role="alert">
                        {error}
                    </p>
                ) : null}
                {notice ? (
                    <output className="text-success text-sm">{notice}</output>
                ) : null}
                <Button className="w-full" type="submit" variant="outline">
                    Save changes
                </Button>
            </FieldGroup>
        </form>
    );
};

const ChangePasswordForm = () => {
    const { error, form, notice } = useChangePasswordForm();

    return (
        <section
            aria-labelledby="change-password-heading"
            className="rounded-xl border p-6"
        >
            <h3
                className="font-heading text-base font-semibold"
                id="change-password-heading"
            >
                Change password
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
                Use at least 8 characters with an uppercase letter and a number
                or symbol.
            </p>
            <form
                className="mt-4"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <FieldGroup>
                    <form.AppField name="currentPassword">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="current-password"
                                label="Current password"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="password">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="new-password"
                                label="New password"
                            />
                        )}
                    </form.AppField>
                    <form.AppField name="confirmPassword">
                        {(field) => (
                            <field.PasswordField
                                autoComplete="new-password"
                                label="Confirm new password"
                            />
                        )}
                    </form.AppField>
                    {error ? (
                        <p className="text-destructive text-sm" role="alert">
                            {error}
                        </p>
                    ) : null}
                    {notice ? (
                        <output className="text-success text-sm">
                            {notice}
                        </output>
                    ) : null}
                    <Button className="w-full" type="submit">
                        Update password
                    </Button>
                </FieldGroup>
            </form>
        </section>
    );
};

export const ProfilePage = ({ user }: { user: ProfileUser }) => {
    const role = user.role ?? "user";

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="font-heading text-lg font-semibold">Profile</h2>
                <p className="text-muted-foreground text-sm">
                    Your account details and password.
                </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
                <section
                    aria-labelledby="account-heading"
                    className="rounded-xl border p-6"
                >
                    <h3
                        className="font-heading text-base font-semibold"
                        id="account-heading"
                    >
                        Account
                    </h3>
                    <div className="mt-4 flex items-center gap-4">
                        <UserAvatar
                            className="size-16"
                            image={user.image}
                            name={user.name}
                            size="lg"
                        />
                        <div className="min-w-0">
                            <p className="truncate font-medium">{user.name}</p>
                            <p className="text-muted-foreground truncate text-sm">
                                {user.email}
                            </p>
                            <Badge
                                className="mt-2"
                                variant={
                                    role === "admin" ? "default" : "secondary"
                                }
                            >
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </Badge>
                        </div>
                    </div>
                    <ProfileDetailsForm user={user} />
                </section>
                <ChangePasswordForm />
            </div>
        </div>
    );
};
