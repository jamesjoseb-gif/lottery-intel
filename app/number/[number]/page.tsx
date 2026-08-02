import { notFound, redirect } from "next/navigation";
type Props = { params: Promise<{ number: string }> };
export default async function LegacyNumberPage({ params }: Props) { const { number } = await params; if (!/^\d{4}$/.test(number)) notFound(); redirect(`/4d/number/${number}`); }
