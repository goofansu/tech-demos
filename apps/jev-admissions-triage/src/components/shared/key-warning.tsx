type Props = { show: boolean };

export function KeyWarning({ show }: Props) {
  if (!show) return null;
  return (
    <div role="alert" className="rounded-lg border border-warning/40 bg-warning-soft px-3 py-2 text-sm">
      <p className="font-medium text-warning-foreground">No API key</p>
      <p className="mt-1 text-warning-foreground/90">
        Add a TypeSafe API key on the server and reload. Evaluation stays disabled until the key is present. The key
        never reaches the browser.
      </p>
    </div>
  );
}
