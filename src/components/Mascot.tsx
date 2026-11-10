/**
 * The Palabra mascot. All v1 art is inline SVG here; when real character art
 * arrives, pass `imageSrc` and it takes over the slot — no other changes needed.
 * `mood` switches the face: happy (default), cheer (celebration), sad (mistake).
 */
export function Mascot({
  size = 96,
  mood = "happy",
  imageSrc,
  className = "",
}: {
  size?: number;
  mood?: "happy" | "cheer" | "sad";
  imageSrc?: string;
  className?: string;
}) {
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt="Palabra mascot"
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="Palabra mascot"
      className={className}
    >
      {/* feet */}
      <rect x="42" y="102" width="12" height="8" rx="4" fill="#D97706" />
      <rect x="66" y="102" width="12" height="8" rx="4" fill="#D97706" />
      {/* tail feather */}
      <path d="M30 78 Q14 74 16 58 Q26 68 34 70 Z" fill="#B45309" />
      {/* body */}
      <circle cx="60" cy="60" r="44" fill="#F59E0B" />
      {/* belly */}
      <ellipse cx="60" cy="70" rx="28" ry="24" fill="#FFEDD5" />
      {/* wings */}
      <path d="M22 60 Q14 72 24 82 Q30 70 34 64 Z" fill="#D97706" />
      <path d="M98 60 Q106 72 96 82 Q90 70 86 64 Z" fill="#D97706" />
      {/* crest */}
      <path d="M52 16 Q56 6 62 14 Q68 4 72 15 Q66 20 60 19 Q55 20 52 16 Z" fill="#D97706" />
      {mood === "cheer" ? (
        <>
          {/* joyful closed eyes */}
          <path d="M38 50 Q44 42 50 50" stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M70 50 Q76 42 82 50" stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" />
          <ellipse cx="60" cy="62" rx="7" ry="5" fill="#EA580C" />
        </>
      ) : mood === "sad" ? (
        <>
          {/* droopy eyes */}
          <circle cx="44" cy="52" r="8" fill="#fff" />
          <circle cx="76" cy="52" r="8" fill="#fff" />
          <path d="M40 54 h8" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          <path d="M72 54 h8" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          <path d="M36 42 Q44 38 50 42" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M70 42 Q76 38 84 42" stroke="#78350F" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M52 66 Q60 60 68 66" stroke="#78350F" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* friendly eyes */}
          <circle cx="44" cy="50" r="9" fill="#fff" />
          <circle cx="76" cy="50" r="9" fill="#fff" />
          <circle cx="46" cy="52" r="4.5" fill="#1C1917" />
          <circle cx="74" cy="52" r="4.5" fill="#1C1917" />
          <circle cx="47.5" cy="50" r="1.5" fill="#fff" />
          <circle cx="75.5" cy="50" r="1.5" fill="#fff" />
          {/* beak */}
          <path d="M54 60 L66 60 L60 70 Z" fill="#EA580C" />
          {/* blush */}
          <ellipse cx="32" cy="62" rx="5" ry="3" fill="#FB923C" opacity="0.7" />
          <ellipse cx="88" cy="62" rx="5" ry="3" fill="#FB923C" opacity="0.7" />
        </>
      )}
      {/* little book */}
      <path d="M44 88 Q60 82 60 90 Q60 82 76 88 L76 96 Q60 91 60 96 Q60 91 44 96 Z" fill="#0F766E" />
      <path d="M60 90 L60 96" stroke="#134E4A" strokeWidth="2" />
    </svg>
  );
}
