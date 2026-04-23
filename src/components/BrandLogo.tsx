import { Link } from "react-router-dom";

type Props = {
  compact?: boolean;
  asLink?: boolean;
  className?: string;
};

const BrandLogoInner = ({ compact = false, className = "" }: Omit<Props, "asLink">) => (
  <div className={`ultima-brand ${compact ? "ultima-brand-compact" : ""} ${className}`.trim()}>
    <div className="ultima-brand-mark" aria-hidden="true">
      <span className="ultima-brand-core" />
      <span className="ultima-brand-orbit" />
      <span className="ultima-brand-orbit ultima-brand-orbit-alt" />
    </div>
    <div className="ultima-brand-text-wrap">
      <span className="ultima-brand-text">ULTIMA</span>
      {!compact && <span className="ultima-brand-sub">SPORTS INTELLIGENCE</span>}
    </div>
  </div>
);

const BrandLogo = ({ compact = false, asLink = false, className = "" }: Props) => {
  if (asLink) {
    return (
      <Link to="/" className="inline-flex items-center">
        <BrandLogoInner compact={compact} className={className} />
      </Link>
    );
  }

  return <BrandLogoInner compact={compact} className={className} />;
};

export default BrandLogo;
