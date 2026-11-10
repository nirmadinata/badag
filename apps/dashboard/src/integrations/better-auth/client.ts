import { adminClient, inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { accessControl, ROLES } from "@/integrations/better-auth/roles";
import type { auth } from "@/integrations/better-auth/server";

export const authClient = createAuthClient({
    plugins: [
        adminClient({ ac: accessControl, roles: ROLES }),
        inferAdditionalFields<typeof auth>(),
    ],
});
