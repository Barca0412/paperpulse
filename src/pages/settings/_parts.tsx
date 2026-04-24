import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export function SettingsSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5 mb-4">{description}</p>}
      {children}
    </div>
  );
}

export function SettingsRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="py-3 grid grid-cols-[260px_1fr] gap-6 items-start border-b last:border-0">
      <div>
        <div className="text-xs font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-[11px]">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
