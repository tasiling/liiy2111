import LiaojiePublicationWorkbench from "@/app/components/LiaojiePublicationWorkbench";

export default async function LiaojieWorkbenchPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <LiaojiePublicationWorkbench initialId={id ?? null} />;
}
