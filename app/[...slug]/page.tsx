import { QuantTerminal } from "../QuantTerminal";

export default async function ModuleRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <QuantTerminal initialPath={`/${slug.join("/")}`} />;
}
