"use client";

type ByteState = "idle" | "typing" | "error" | "loading";

export function Byte({ state = "idle", className = "" }: { state?: ByteState; className?: string }) {
  return (
    <svg className={"byte-svg is-" + state + (className ? " " + className : "")} viewBox="270 85 210 150" aria-hidden="true" focusable="false">
      <line className="byte-ground" x1="285" y1="224" x2="395" y2="224"/>
      <g className="byte-bob">
        <g className="byte-glitch-legs">
          <rect className="byte-leg byte-leg-a" x="344" y="210" width="10" height="14"/>
          <rect className="byte-leg byte-leg-b" x="372" y="210" width="10" height="14"/>
        </g>
        <g className="byte-glitch-top">
          <line className="byte-antenna-line" x1="340" y1="120" x2="340" y2="102"/>
          <rect className="byte-antenna" x="335" y="92" width="10" height="10"/>
          <rect className="byte-body" x="290" y="120" width="100" height="90"/>
          <path className="byte-body" d="M306 210 L306 232 L330 210"/>
          <line className="byte-seam" x1="307" y1="210" x2="329" y2="210"/>
          <g className="byte-eyes">
            <g className="byte-look">
              <rect x="314" y="152" width="14" height="14"/>
              <rect x="352" y="152" width="14" height="14"/>
            </g>
          </g>
          <g className="byte-x">
            <line x1="314" y1="152" x2="328" y2="166"/>
            <line x1="328" y1="152" x2="314" y2="166"/>
            <line x1="352" y1="152" x2="366" y2="166"/>
            <line x1="366" y1="152" x2="352" y2="166"/>
          </g>
          <g className="byte-mouth">
            <rect className="byte-cursor" x="328" y="186" width="24" height="4"/>
          </g>
          <rect className="byte-tear byte-tear-1" x="296" y="143" width="88" height="4"/>
          <rect className="byte-tear byte-tear-2" x="288" y="176" width="88" height="3"/>
        </g>
      </g>
      <rect className="byte-bubble" x="408" y="104" width="68" height="30"/>
      <g className="byte-dots">
        <rect className="byte-dot" x="420" y="115" width="8" height="8"/>
        <rect className="byte-dot byte-dot-2" x="438" y="115" width="8" height="8"/>
        <rect className="byte-dot byte-dot-3" x="456" y="115" width="8" height="8"/>
      </g>
      <g className="byte-chars">
        <rect className="byte-c1" x="420" y="113" width="6" height="12"/>
        <rect className="byte-c2" x="432" y="115" width="6" height="8"/>
        <rect className="byte-c3" x="444" y="113" width="6" height="12"/>
        <rect className="byte-c4" x="456" y="115" width="6" height="8"/>
      </g>
      <g className="byte-bang">
        <rect x="439" y="109" width="6" height="11"/>
        <rect x="439" y="123" width="6" height="6"/>
      </g>
    </svg>
  );
}
