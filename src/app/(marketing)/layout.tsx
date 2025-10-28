import FooterLinks from "@/components/layout/FooterLinks";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <FooterLinks />
    </>
  );
}
