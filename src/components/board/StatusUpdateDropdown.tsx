import { useState } from 'react';
import { STATUS_OPTIONS } from '@/lib/constants';
import { updateFeatureRequest } from '@/server/functions/feature-requests';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface StatusUpdateDropdownProps {
  requestId: string;
  currentStatus: string;
  onUpdated?: () => void;
}

export function StatusUpdateDropdown({ requestId, currentStatus, onUpdated }: StatusUpdateDropdownProps) {
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    setUpdating(true);
    try {
      await updateFeatureRequest({ data: { id: requestId, status: newStatus } });
      toast.success(`Status updated to "${newStatus}"`);
      onUpdated?.();
    } catch {
      toast.error('Failed to update status');
    }
    setUpdating(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={updating}>
        <button className="cursor-pointer">
          <StatusBadge status={currentStatus} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_OPTIONS.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className={status === currentStatus ? 'font-semibold' : ''}
          >
            <StatusBadge status={status} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
