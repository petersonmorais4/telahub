import logoAsset from "@/assets/telahub-logo-oficial.png.asset.json";

export function BrandLogo({ className = "h-11 w-auto" }: { className?: string }) {
  return <img src={logoAsset.url} alt="TelaHub" className={className} />;
}