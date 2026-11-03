import { useNavigate } from "@tanstack/react-router";

import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { navigation } from "@/features/dashboard/navigation";

interface CommandMenuProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isAdmin: boolean;
}

export const CommandMenu = ({
    open,
    onOpenChange,
    isAdmin,
}: CommandMenuProps) => {
    const navigate = useNavigate();

    return (
        <CommandDialog
            description="Jump to a page."
            onOpenChange={onOpenChange}
            open={open}
            title="Command menu"
        >
            <Command>
                <CommandInput placeholder="Search pages…" />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Pages">
                        {navigation
                            .filter((item) => !item.adminOnly || isAdmin)
                            .map((item) => (
                                <CommandItem
                                    key={item.title}
                                    onSelect={() => {
                                        navigate({ to: item.to });
                                        onOpenChange(false);
                                    }}
                                    value={item.title}
                                >
                                    <item.icon />
                                    {item.title}
                                </CommandItem>
                            ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
};
