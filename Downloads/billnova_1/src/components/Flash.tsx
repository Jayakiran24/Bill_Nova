export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return <div className={err ? 'alert error' : 'alert ok'}>{err || ok}</div>;
}
