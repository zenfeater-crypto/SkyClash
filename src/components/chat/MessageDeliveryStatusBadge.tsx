import React from 'react';
import { Database, Clock, Check, Loader2, Info } from 'lucide-react';
import { MessageDeliveryStatus } from '../../types';

interface MessageDeliveryStatusBadgeProps {
  status?: MessageDeliveryStatus | string;
  showLabel?: boolean;
  size?: 'xs' | 'sm';
  onClickInfo?: () => void;
  className?: string;
}

/**
 * MessageDeliveryStatusBadge
 * 
 * Accurately and clearly distinguishes the 5 delivery states:
 * 1. 'saved_locally': Saved in this device's IndexedDB (never displays checkmarks so users are never misled)
 * 2. 'sending': In-flight / transmitting
 * 3. 'sent': Single checkmark (reached server)
 * 4. 'delivered': Double grey checkmarks (reached recipient device)
 * 5. 'read': Double colored checkmarks (recipient viewed message)
 */
export const MessageDeliveryStatusBadge: React.FC<MessageDeliveryStatusBadgeProps> = ({
  status = 'saved_locally',
  showLabel = true,
  size = 'xs',
  onClickInfo,
  className = ''
}) => {
  const normStatus: MessageDeliveryStatus = 
    (status === 'sending' || status === 'sent' || status === 'delivered' || status === 'read' || status === 'saved_locally')
      ? status
      : 'saved_locally';

  const iconSize = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';

  // 1. SAVED LOCALLY: Local IndexedDB database on device only (Not Sent / Not Delivered)
  if (normStatus === 'saved_locally') {
    return (
      <button
        type="button"
        onClick={onClickInfo}
        className={`inline-flex items-center gap-1 ${textSize} font-mono text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 px-1.5 py-0.5 rounded cursor-pointer transition select-none ${className}`}
        title="Saved to this device's local IndexedDB database. Local storage alone cannot deliver messages to another player without a communication transport."
      >
        <Database className={`${iconSize} text-cyan-400 shrink-0`} />
        {showLabel && <span>Saved locally</span>}
        {onClickInfo && <Info className="w-2 h-2 text-cyan-400/70 ml-0.5" />}
      </button>
    );
  }

  // 2. SENDING: Transmitting through transport
  if (normStatus === 'sending') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-mono text-slate-400 bg-slate-900/60 border border-slate-700/40 px-1.5 py-0.5 rounded select-none ${className}`}
        title="Transmitting message..."
      >
        <Loader2 className={`${iconSize} animate-spin text-slate-400 shrink-0`} />
        {showLabel && <span>Sending...</span>}
      </span>
    );
  }

  // 3. SENT: Reached communication server
  if (normStatus === 'sent') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-mono text-slate-300 bg-slate-900/60 border border-slate-700/40 px-1.5 py-0.5 rounded select-none ${className}`}
        title="Sent: Message reached the network / server."
      >
        <Check className={`${iconSize} text-slate-400 shrink-0`} />
        {showLabel && <span>Sent</span>}
      </span>
    );
  }

  // 4. DELIVERED: Reached recipient's device
  if (normStatus === 'delivered') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-mono text-slate-300 bg-slate-900/60 border border-slate-700/40 px-1.5 py-0.5 rounded select-none ${className}`}
        title="Delivered: Message reached recipient's device."
      >
        <span className="inline-flex -space-x-1 items-center shrink-0">
          <Check className={`${iconSize} text-slate-400`} />
          <Check className={`${iconSize} text-slate-400`} />
        </span>
        {showLabel && <span>Delivered</span>}
      </span>
    );
  }

  // 5. READ: Recipient opened conversation
  if (normStatus === 'read') {
    return (
      <span
        className={`inline-flex items-center gap-1 ${textSize} font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-1.5 py-0.5 rounded select-none ${className}`}
        title="Read: Recipient opened and viewed this message."
      >
        <span className="inline-flex -space-x-1 items-center shrink-0">
          <Check className={`${iconSize} text-cyan-400`} />
          <Check className={`${iconSize} text-cyan-400`} />
        </span>
        {showLabel && <span>Read</span>}
      </span>
    );
  }

  return null;
};
