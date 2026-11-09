import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useCreateUserForm } from "@/features/users/hooks/use-create-user-form";

interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
}

export const CreateUserDialog = ({
    open,
    onOpenChange,
    onCreated,
}: CreateUserDialogProps) => {
    const { form, isAdmin, setIsAdmin } = useCreateUserForm({
        onCreated,
        onOpenChange,
    });

    return (
        <Dialog onOpenChange={onOpenChange} open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                    <DialogDescription>
                        The account signs in with this email and password.
                    </DialogDescription>
                </DialogHeader>
                <form
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
                                    autoComplete="off"
                                    label="Full name"
                                    placeholder="Nadia Rahman"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name="email">
                            {(field) => (
                                <field.TextField
                                    autoComplete="off"
                                    label="Email"
                                    placeholder="you@company.com"
                                    type="email"
                                />
                            )}
                        </form.AppField>
                        <form.AppField name="password">
                            {(field) => (
                                <field.PasswordField
                                    autoComplete="new-password"
                                    description="At least 8 characters."
                                    label="Temporary password"
                                />
                            )}
                        </form.AppField>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={isAdmin}
                                id="create-user-admin"
                                onCheckedChange={(checked) =>
                                    setIsAdmin(checked === true)
                                }
                            />
                            <Label htmlFor="create-user-admin">
                                Grant administrator access
                            </Label>
                        </div>
                        <DialogFooter>
                            <Button
                                onClick={() => onOpenChange(false)}
                                type="button"
                                variant="outline"
                            >
                                Cancel
                            </Button>
                            <Button type="submit">Create user</Button>
                        </DialogFooter>
                    </FieldGroup>
                </form>
            </DialogContent>
        </Dialog>
    );
};
