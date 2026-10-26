// Shared brand header — IHospitality lockup (iH mark + wordmark) in the shell,
// Tech-Trader pill at right. logo.svg is the Celtic-Blue/white iH mark.
export function BrandHeader() {
  return (
    <header className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand__logo" src="/logo.svg" alt="iHospitality" height={30} />
      <span className="brand__word">iHospitality</span>
      <span className="brand__pill">Powered by Tech-Trader&trade; <span aria-hidden>✦</span></span>
    </header>
  );
}
