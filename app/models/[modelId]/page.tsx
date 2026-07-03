import { redirect } from "next/navigation";

import { getModelPath } from "@/lib/model-paths";

export default async function ModelIndexPage(props: PageProps<"/models/[modelId]">) {
  const { modelId } = await props.params;

  redirect(getModelPath(modelId));
}
