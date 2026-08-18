import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { useCreateSiteMutation } from "@/features/workspaces/api/workspaceApi";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";

const createSiteSchema = z.object({
    name: z.string().trim().min(2, "Name must contain at least 2 characters."),
    url: z
        .string()
        .trim()
        .min(1, "Website URL is required.")
        .refine((value) => /^https?:\/\//i.test(value), {
            message: "URL must start with http:// or https://",
        }),
});

type CreateSiteFormData = z.infer<typeof createSiteSchema>;

export function AddSitePage() {
    const navigate = useNavigate();
    const workspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const [createSite, { isLoading }] = useCreateSiteMutation();
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const form = useForm<CreateSiteFormData>({
        resolver: zodResolver(createSiteSchema),
        defaultValues: { name: "", url: "" },
    });

    const onSubmit = form.handleSubmit(async (values) => {
        if (!workspaceId) {
            setSubmitError("Select a workspace before adding a website.");
            return;
        }

        setSubmitError(null);
        setFieldErrors({});

        try {
            const result = await createSite({
                workspaceId,
                name: values.name,
                url: values.url,
            }).unwrap();
            toast.success("Website added.");
            navigate(`/app/sites/${result.data.site.id}`);
        } catch (error) {
            const parsed = getApiError(error);
            if (parsed.fields) {
                setFieldErrors(parsed.fields);
            }
            setSubmitError(parsed.message);
        }
    });

    return (
        <div>
            <PageHeader title="Add website" description="Add a site to the current workspace." />

            <form className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6" onSubmit={onSubmit}>
                {submitError ? <Alert>{submitError}</Alert> : null}

                <div className="space-y-2">
                    <Label htmlFor="site-name">Name</Label>
                    <Input id="site-name" {...form.register("name")} />
                    {(form.formState.errors.name?.message
                        ? [form.formState.errors.name.message]
                        : (fieldErrors.name ?? [])
                    ).map((message) => (
                        <p key={message} className="text-xs text-red-600">
                            {message}
                        </p>
                    ))}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="site-url">Website URL</Label>
                    <Input
                        id="site-url"
                        placeholder="https://example.com"
                        {...form.register("url")}
                    />
                    {(form.formState.errors.url?.message
                        ? [form.formState.errors.url.message]
                        : (fieldErrors.url ?? [])
                    ).map((message) => (
                        <p key={message} className="text-xs text-red-600">
                            {message}
                        </p>
                    ))}
                </div>

                <Button type="submit" loading={isLoading} loadingText="Adding website...">
                    Add website
                </Button>
            </form>
        </div>
    );
}
