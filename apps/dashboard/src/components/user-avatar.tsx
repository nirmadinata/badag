import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
    name: string;
    image?: string | null;
    size?: "default" | "sm" | "lg";
    className?: string;
}

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/u).filter(Boolean).slice(0, 2);

    if (parts.length === 0) {
        return "?";
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
};

export const UserAvatar = ({
    name,
    image,
    size = "default",
    className,
}: UserAvatarProps) => (
    <Avatar className={className} size={size}>
        {image ? <AvatarImage alt={`${name}'s avatar`} src={image} /> : null}
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
);
