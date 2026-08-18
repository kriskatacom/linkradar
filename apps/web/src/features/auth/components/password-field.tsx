import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PasswordFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    name?: string;
    errorMessages?: string[];
    autoComplete?: string;
};

export function PasswordField({
    label,
    value,
    onChange,
    onBlur,
    name,
    errorMessages,
    autoComplete,
}: PasswordFieldProps) {
    const [show, setShow] = useState(false);
    const id = useId();

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input
                    id={id}
                    name={name}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    autoComplete={autoComplete}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1 h-8 w-8"
                    onClick={() => setShow((current) => !current)}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
            {errorMessages?.map((message) => (
                <p key={message} className="text-xs text-red-600">
                    {message}
                </p>
            ))}
        </div>
    );
}
