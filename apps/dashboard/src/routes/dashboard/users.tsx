import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { CreateUserDialog } from "@/features/users/components/create-user-dialog";
import { UserActions } from "@/features/users/components/user-actions";
import { isAdminRole } from "@/integrations/better-auth/roles";
import { listUsers } from "@/integrations/better-auth/session";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const UsersPage = () => {
    const users = Route.useLoaderData();
    const { user: currentUser } = Route.useRouteContext();
    const router = useRouter();
    const [createOpen, setCreateOpen] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="font-heading text-lg font-semibold">
                        Users
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Accounts that can sign in to Badag.
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <UserPlusIcon data-icon="inline-start" />
                    Create user
                </Button>
            </div>
            <div className="overflow-hidden rounded-xl border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Created
                            </TableHead>
                            <TableHead className="w-10">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            isAdminRole(user.role)
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {user.banned ? "Banned" : "Active"}
                                </TableCell>
                                <TableCell className="text-right">
                                    {dateFormatter.format(
                                        new Date(user.createdAt)
                                    )}
                                </TableCell>
                                <TableCell>
                                    <UserActions
                                        isSelf={currentUser.id === user.id}
                                        onChanged={() => router.invalidate()}
                                        user={user}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <CreateUserDialog
                onCreated={() => router.invalidate()}
                onOpenChange={setCreateOpen}
                open={createOpen}
            />
        </div>
    );
};

export const Route = createFileRoute("/dashboard/users")({
    beforeLoad: ({ context }) => {
        if (!isAdminRole(context.user.role)) {
            throw redirect({ to: "/dashboard" });
        }
    },
    loader: () => listUsers(),
    component: UsersPage,
});
