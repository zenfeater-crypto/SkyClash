import React from 'react';
import { History, Trash2, Calendar, Scale, ArrowRight, ExternalLink } from 'lucide-react';
import { useUserData } from '../context/UserDataContext';
import { formatCoins, formatFullCoins, formatTimeAgo } from '../lib/formatters';
import { TradeRecord, TradeItemSlot, SkyblockItem } from '../types';
import { useItems } from '../context/ItemsContext';
import { BackButton } from '../components/BackButton';

interface TradeHistoryViewProps {
  onLoadTradeIntoCalculator: (yourOffer: TradeItemSlot[], theirOffer: TradeItemSlot[]) => void;
  onOpenCalculator: () => void;
  onBack?: () => void;
}

export const TradeHistoryView: React.FC<TradeHistoryViewProps> = ({
  onLoadTradeIntoCalculator,
  onOpenCalculator,
  onBack,
}) => {
  const { tradeHistory, deleteTrade } = useUserData();
  const { getItemById } = useItems();

  const handleRestoreTrade = (trade: TradeRecord) => {
    const yourSlots: TradeItemSlot[] = trade.yourItems
      .map((it) => {
        const found = getItemById(it.itemId);
        if (found) return { item: found, quantity: it.quantity };
        return {
          item: {
            id: it.itemId,
            name: it.name,
            normalizedName: it.name.toLowerCase(),
            category: 'Misc',
            value: it.value,
            demand: 'MEDIUM',
            rarity: it.rarity,
            image: it.image,
            description: '',
            updatedAt: Date.now(),
          },
          quantity: it.quantity,
        };
      })
      .filter(Boolean) as TradeItemSlot[];

    const theirSlots: TradeItemSlot[] = trade.theirItems
      .map((it) => {
        const found = getItemById(it.itemId);
        if (found) return { item: found, quantity: it.quantity };
        return {
          item: {
            id: it.itemId,
            name: it.name,
            normalizedName: it.name.toLowerCase(),
            category: 'Misc',
            value: it.value,
            demand: 'MEDIUM',
            rarity: it.rarity,
            image: it.image,
            description: '',
            updatedAt: Date.now(),
          },
          quantity: it.quantity,
        };
      })
      .filter(Boolean) as TradeItemSlot[];

    onLoadTradeIntoCalculator(yourSlots, theirSlots);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {onBack && (
        <div className="mb-2">
          <BackButton onClick={onBack} label="Back" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase font-mono flex items-center gap-3">
            <History className="w-7 h-7 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Saved Trade History
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit trail of your saved trade calculations, net coin deltas, and breakdown logs.
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full">
          {tradeHistory.length} Saved
        </span>
      </div>

      {tradeHistory.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Scale className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Trades Saved</h3>
          <p className="text-xs text-slate-400 mb-6">
            Compare offers in the Trade Calculator and click "Save Trade" to build your trading log.
          </p>
          <button
            onClick={onOpenCalculator}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition"
          >
            Open Trade Calculator <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tradeHistory.map((trade) => (
            <div
              key={trade.id}
              className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{new Date(trade.timestamp).toLocaleString()}</span>
                  <span>({formatTimeAgo(trade.timestamp)})</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreTrade(trade)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Re-open in Calculator
                  </button>

                  <button
                    onClick={() => deleteTrade(trade.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Your Total</span>
                  <div className="font-mono text-sm sm:text-base font-bold text-cyan-400">
                    {formatCoins(trade.yourTotal)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Their Total</span>
                  <div className="font-mono text-sm sm:text-base font-bold text-purple-400">
                    {formatCoins(trade.theirTotal)}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Difference</span>
                  <div
                    className={`font-mono text-sm sm:text-base font-bold ${
                      trade.difference > 0
                        ? 'text-emerald-400'
                        : trade.difference < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {trade.difference > 0 ? `+${formatCoins(trade.difference)}` : `${formatCoins(trade.difference)}`}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Percentage</span>
                  <div
                    className={`font-mono text-sm sm:text-base font-bold ${
                      trade.percentageDiff > 0
                        ? 'text-emerald-400'
                        : trade.percentageDiff < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {trade.percentageDiff > 0 ? `+${trade.percentageDiff.toFixed(1)}%` : `${trade.percentageDiff.toFixed(1)}%`}
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Your Items */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    Your Items ({trade.yourItems.length})
                  </span>
                  <div className="space-y-1">
                    {trade.yourItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/40"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={item.image} alt={item.name} className="w-5 h-5 rounded object-contain" />
                          <span className="truncate text-white font-medium">
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">
                          {formatCoins(item.value * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Their Items */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">
                    Their Items ({trade.theirItems.length})
                  </span>
                  <div className="space-y-1">
                    {trade.theirItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/40 border border-slate-800/40"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={item.image} alt={item.name} className="w-5 h-5 rounded object-contain" />
                          <span className="truncate text-white font-medium">
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                        <span className="font-mono text-slate-400 shrink-0">
                          {formatCoins(item.value * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {trade.note && (
                <div className="text-xs bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                  <span className="text-slate-500 font-bold mr-1">Note:</span> {trade.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
