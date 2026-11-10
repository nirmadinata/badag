import { constants } from "@badag/db-schema/main-db";
import {
    MoreHorizontalIcon,
    ShieldCheckIcon,
    ShieldIcon,
    UserMinusIcon,
} from "lucide-react";
import { useState } from "react";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/integrations/better-auth/client";
import { toast } from "@/lib/toast";

interface UserActionsUser {
    id: string;
    name: string;
    email: string;
    role?: string | null;
}

interface UserActionsProps {
    isSelf: boolean;
    onChanged: () => void;
    user: UserActionsUser;
}

interface AuthResult {
    error: { message?: string } | null;
}

export const UserActions = ({ isSelf, onChanged, user }: UserActionsProps) => {
    const [pending, setPending] = useState(false);
    const [removeOpen, setRemoveOpen] = useState(false);
    const isSuperadmin = user.role === constants.ENUM_USER_ROLE.Superadmin;
    // Role changes always go through another administrator.
    const canChangeRole = !isSelf;

    const run = async (
        action: () => Promise<AuthResult>,
        successMessage: string
    ): Promise<boolean> => {
        setPending(true);

        let succeeded = false;

        try {
            const { error } = await action();

            if (error) {
                toast.error({
                    title: "Action failed",
                    description: error.message,
                });
            } else {
                toast.success({ title: successMessage });
                onChanged();
                succeeded = true;
            }
        } catch (error) {
            toast.error({
                title: "Action failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Something went wrong.",
            });
        }

        setPending(false);

        return succeeded;
    };

    const handleToggleRole = () => {
        const role = isSuperadmin
            ? constants.ENUM_USER_ROLE.Admin
            : constants.ENUM_USER_ROLE.Superadmin;

        void run(
            () => authClient.admin.setRole({ role, userId: user.id }),
            `${user.name} is now ${role}`
        );
    };

    const handleRemove = async () => {
        const removed = await run(
            () => authClient.admin.removeUser({ userId: user.id }),
            `${user.name} was removed`
        );

        if (removed) {
            setRemoveOpen(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            aria-label={`Actions for ${user.name}`}
                            disabled={pending}
                            size="icon-sm"
                            variant="ghost"
                        />
                    }
                >
                    <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-44">
                    <DropdownMenuItem
                        disabled={pending || !canChangeRole}
                        onClick={handleToggleRole}
                    >
                        {isSuperadmin ? <ShieldIcon /> : <ShieldCheckIcon />}
                        {isSuperadmin ? "Make admin" : "Make superadmin"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={pending || isSelf}
                        onClick={() => setRemoveOpen(true)}
                        variant="destructive"
                    >
                        <UserMinusIcon />
                        Remove user
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog onOpenChange={setRemoveOpen} open={removeOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove {user.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This permanently removes {user.email} and revokes
                            all of their sessions. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={pending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={pending}
                            onClick={() => {
                                void handleRemove();
                            }}
                            variant="destructive"
                        >
                            Remove user
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
