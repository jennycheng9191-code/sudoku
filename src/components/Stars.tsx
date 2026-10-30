export default function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="stars" aria-label={`${n} 顆星`}>
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? "star-on" : "star-off"}>
          ★
        </span>
      ))}
    </span>
  );
}
