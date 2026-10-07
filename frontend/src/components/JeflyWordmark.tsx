export default function JeflyWordmark({
  iconOnly = false,
}: {
  iconOnly?: boolean;
}) {
  return (
    <span className="jefly-wordmark">
      <span className="jefly-mark" aria-hidden="true">
        J
      </span>
      {!iconOnly && <span>Jëfly</span>}
    </span>
  );
}
