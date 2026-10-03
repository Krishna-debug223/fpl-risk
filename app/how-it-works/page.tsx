import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { guideLinks } from "@/lib/navigation";

export const metadata = pageMetadata({
  title: "FPL Prism — How it works",
  description: "How FPL Prism turns public FPL data into expected points, outcome ranges and transfer comparisons.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <main className="page page-narrow">
      <div className="page-head">
        <div>
          <h1>How FPL Prism works</h1>
          <p className="lead">
            A plain-language summary of where the numbers come from and what they can and can&apos;t tell you.
            For the full technical notes, see <Link href="/dashboard?view=model">Model details</Link>.
          </p>
        </div>
      </div>

      <div className="prose">
        <h2>1. The data</h2>
        <p>
          Everything starts from the public Fantasy Premier League feeds: players, prices, fixtures, official availability news and
          past Gameweek scores. Completed seasons are used as a starting point for players with little current data. When you enter
          a Team ID, FPL Prism reads that team&apos;s public picks — it never logs in to FPL and can&apos;t change your team.
        </p>

        <h2>2. Projecting each player</h2>
        <p>
          For every player and every upcoming Gameweek, the model estimates how likely they are to start or come off the bench, then
          adds up the points they&apos;d expect from each source: appearing, attacking returns, clean sheets, saves, defensive
          contributions, bonus and cards. These parts sum to the player&apos;s <strong>expected points</strong>. Fixture difficulty
          shapes those parts; it isn&apos;t added on top. Open any player in the dashboard to see the breakdown.
        </p>

        <h2>3. The range, not just the average</h2>
        <p>
          The model then plays out each player&apos;s matches hundreds of times to get a <strong>likely range</strong> — the 10th to 90th
          percentile of outcomes. Two players with the same average can have very different ranges: a nailed-on defender sits in a
          narrow band, while a rotation-risk forward might blank or haul. The <strong>risk</strong> label describes that spread. It&apos;s
          separate from <strong>confidence</strong> (how sure the model is about the player&apos;s role) and <strong>data quality</strong>
          (how much current-season evidence there is).
        </p>

        <h2>4. Comparing transfers</h2>
        <p>
          In Transfers, you choose who you&apos;d sell. FPL Prism searches legal replacements that respect your budget, positions and the
          three-per-club limit, then compares the result with simply holding over the next five Gameweeks. Each transfer beyond your
          free ones costs 4 points, and that hit is subtracted before anything is suggested. If no move clears the bar, it says to hold.
        </p>
        <p>
          Public data doesn&apos;t include your free transfers or the price you&apos;d actually get for a player, so you set the
          first and the tool uses current listed prices for the second. Both assumptions are shown next to every result.
        </p>

        <h2>5. Planning ahead</h2>
        <p>
          The <Link href="/planner">planner</Link> extends the same idea to eight Gameweeks, comparing Safe, Balanced and Aggressive paths
          against rolling your transfers. It explores a bounded number of options, so it&apos;s a strong suggestion rather than a proven
          optimum.
        </p>

        <h2>6. Checking the record</h2>
        <p>
          At each deadline, forecasts are frozen and later compared with official points in the <Link href="/modelbook">Modelbook</Link>,
          including the misses. Use it to judge how much weight to give the numbers.
        </p>

        <h2>What it can&apos;t do</h2>
        <ul>
          <li>Know team news before it&apos;s public. Late injuries and rotation will move results.</li>
          <li>Guarantee points or rank. Expected points are an average over many possible matches.</li>
          <li>See your private FPL data — selling prices, free transfers or chips are inferred or entered by you.</li>
        </ul>

        <h2>Guides</h2>
        <ul>
          {guideLinks.map((guide) => <li key={guide.href}><Link href={guide.href}>{guide.label}</Link></li>)}
        </ul>

        <p className="small muted" style={{ marginTop: 28 }}>
          FPL Prism is an independent project. It is not affiliated with, endorsed by or sponsored by the Premier League.
        </p>
      </div>
    </main>
  );
}
