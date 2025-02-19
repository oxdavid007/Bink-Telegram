interface PnLData {
  pnl: number;
  pnlUsd: number;
}

export const formatPnLMessage = (pnl: PnLData | null): string => {
  if (!pnl.pnl) return "";
  const pnlIcon = pnl.pnl >= 0 ? "🟢" : "🔴";
  const pnlUsdIcon = pnl.pnlUsd >= 0 ? "🟢" : "🔴";
  return `PnL SOL: ${pnlIcon} <code>${pnl.pnl.toFixed(2)}%</code> (Pnl USD: ${pnlUsdIcon} $<code>${pnl.pnlUsd.toFixed(2)}%</code>)`;
};
