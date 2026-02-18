import { Building2, Loader2 } from 'lucide-react';

// A simple placeholder page for sections that will be ported from admin
export default function PlaceholderPage({ title, description }: { title: string; description?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
                {description || 'This page is being migrated to the Property Dashboard. Coming soon!'}
            </p>
        </div>
    );
}
