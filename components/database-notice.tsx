export function DatabaseNotice({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
      <p className="font-semibold">Database setup required</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
