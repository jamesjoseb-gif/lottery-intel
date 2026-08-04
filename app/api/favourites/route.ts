import { NextRequest, NextResponse } from "next/server";
import { buildNumberHistoryStats } from "@/lib/fourd-number";
import { buildNumberIntelligence } from "@/lib/number-intelligence";
import { formatDrawDate, getNumberHistory } from "@/lib/results";

const prizeLabels = { first: "1st Prize", second: "2nd Prize", third: "3rd Prize", starter: "Starter Prize", consolation: "Consolation Prize" } as const;

export async function GET(request: NextRequest) {
  const numbers = [...new Set((request.nextUrl.searchParams.get("numbers") ?? "").split(",").filter(Boolean))];
  if (!numbers.length || numbers.length > 100 || numbers.some((number) => !/^\d{4}$/.test(number))) {
    return NextResponse.json({ error: "Provide between 1 and 100 four-digit numbers." }, { status: 400 });
  }

  try {
    const results = await Promise.all(numbers.map(async (number) => {
      const result = await getNumberHistory(number);
      if (!result.data) throw new Error(result.error ?? `Could not load ${number}.`);
      const stats = buildNumberHistoryStats(result.data.appearances);
      const intelligence = buildNumberIntelligence(result.data.appearances, {
        totalArchiveAppearances: result.data.archiveCounts.total,
        archiveAppearancesLast12Months: result.data.archiveCounts.last12Months,
        archiveAppearancesLast24Months: result.data.archiveCounts.last24Months,
      });
      return {
        number,
        score: intelligence.score.value,
        activityLabel: intelligence.score.label,
        totalWins: stats.total,
        lastAppearance: stats.lastSeen ? formatDrawDate(stats.lastSeen) : null,
        daysSinceLastAppearance: intelligence.daysSinceLastAppearance,
        mostCommonPrize: intelligence.mostCommonPrizeType ? prizeLabels[intelligence.mostCommonPrizeType] : null,
      };
    }));
    return NextResponse.json({ favourites: results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load favourite details." }, { status: 500 });
  }
}
