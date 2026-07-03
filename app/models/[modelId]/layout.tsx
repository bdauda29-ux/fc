import { ModelShell } from "@/components/model-shell";

export default async function ModelLayout(props: LayoutProps<"/models/[modelId]">) {
  const { modelId } = await props.params;

  return <ModelShell modelId={modelId}>{props.children}</ModelShell>;
}
