export default function InlineError({ id, children }) {
  if (!children) return null;
  return <p id={id} className="mt-1 text-sm font-medium text-red-800">{children}</p>;
}
