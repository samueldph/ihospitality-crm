// Shared brand header — iH lockup (mark + wordmark). Two mark variants: the
// blue/white one for the dark theme, the black/blue one for the light theme;
// CSS shows the right one per [data-theme].
export function BrandHeader() {
  return (
    <header className="brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand__logo brand__logo--dark" src="/logo.svg" alt="iHospitality" height={30} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="brand__logo brand__logo--light" src="/logo-light.svg" alt="iHospitality" height={30} />
      <span className="brand__word">iHospitality</span>
      <span className="brand__pill">Powered by Tech-Trader&trade;</span>
    </header>
  );
}

export default BrandHeader;
