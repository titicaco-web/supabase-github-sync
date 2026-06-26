export function Logo() {
  return (
    <div className="logo">
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: 26,
          height: 26,
          borderRadius: 7,
          background: "linear-gradient(150deg,#F43E6A,#E21E48)",
          flex: "none",
        }}
      >
        <svg viewBox="0 0 100 100" width="26" height="26" style={{ position: "absolute", inset: 0 }}>
          <path d="M24 47 Q50 75 76 47" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        </svg>
      </span>
      <span className="logo-word">
        Givin<b>.</b>
      </span>
    </div>
  );
}
