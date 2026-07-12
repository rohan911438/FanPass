interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-8 pt-16 text-center sm:text-left">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-xl text-muted-foreground">{description}</p>}
    </div>
  );
}
