import { constants } from "@badag/db-schema/main-db";
import { createAccessControl } from "better-auth/plugins/access";
import type { Statements } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statements = {
    ...defaultStatements,
    book: ["read"],
} satisfies Statements;

export const accessControl = createAccessControl(statements);

export const ROLES = {
    [constants.ENUM_USER_ROLE.Superadmin]: accessControl.newRole({
        ...adminAc.statements,
        book: ["read"],
    }),
    [constants.ENUM_USER_ROLE.Admin]: accessControl.newRole({
        ...adminAc.statements,
    }),
};

export const isAdminRole = (role: string | null | undefined): boolean =>
    role === constants.ENUM_USER_ROLE.Superadmin ||
    role === constants.ENUM_USER_ROLE.Admin;
