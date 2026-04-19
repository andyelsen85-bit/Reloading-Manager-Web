import { useListReferenceData } from "@workspace/api-client-react";

export function RefDatalist({ id, category }: { id: string; category: string }) {
  const { data = [] } = useListReferenceData(category);
  return (
    <datalist id={id}>
      {(data as Array<{ id: number; value: string }>).map((d) => (
        <option key={d.id} value={d.value} />
      ))}
    </datalist>
  );
}
