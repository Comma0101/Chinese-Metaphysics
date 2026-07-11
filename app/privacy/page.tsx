import { DocPage } from "@/components/DocPage";

export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: { lang?: string } }) {
  return <DocPage slug="privacy" langParam={searchParams.lang} />;
}
