import { GithubIcon, GoogleIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

const providers = [
    { label: "GitHub", icon: GithubIcon },
    { label: "Google", icon: GoogleIcon },
];

export const SocialAuth = () => (
    <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-2">
            {providers.map((provider) => (
                <Button key={provider.label} type="button" variant="outline">
                    <provider.icon />
                    {provider.label}
                </Button>
            ))}
        </div>
        <div className="relative">
            <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center"
            >
                <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center">
                <span className="bg-card text-muted-foreground px-2 text-xs">
                    or continue with email
                </span>
            </div>
        </div>
    </div>
);
