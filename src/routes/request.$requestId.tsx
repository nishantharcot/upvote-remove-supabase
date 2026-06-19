import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import type { VoteState } from '@/components/board/UpvoteButton';
import { useAuth } from '@/hooks/use-auth';
import { useVotes } from '@/hooks/use-votes';
import { getFeatureRequest, deleteFeatureRequest } from '@/server/functions/feature-requests';
import { UpvoteButton } from '@/components/board/UpvoteButton';
import { StatusUpdateDropdown } from '@/components/board/StatusUpdateDropdown';
import { CommentSection } from '@/components/board/CommentSection';
import { EditRequestSheet } from '@/components/board/EditRequestSheet';
import { Toaster } from '@/components/ui/sonner';
import { AuthPage } from '@/components/auth/AuthPage';
import { ArrowLeft, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';
import type { FeatureRequest } from '@/hooks/use-feature-requests';

export const Route = createFileRoute('/request/$requestId')({
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { requestId } = Route.useParams();
  const { user, isLoading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();

  const [request, setRequest] = useState<FeatureRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getFeatureRequest({ data: { requestId } });
      setRequest(data);
    } catch {
      setRequest(null);
    }
    setIsLoading(false);
  }, [requestId, user]);

  const { handleVote, getVoteState } = useVotes(user?.id ?? null, fetchDetail);

  useEffect(() => {
    fetchDetail();
    const interval = setInterval(fetchDetail, 10_000);
    return () => clearInterval(interval);
  }, [fetchDetail]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthPage onSuccess={() => refresh()} />
        <Toaster />
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Request not found</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Back to board
        </Link>
      </div>
    );
  }

  const currentVoteState = getVoteState(requestId, request.vote_state);

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
          <button
            onClick={() => navigate({ to: '/' })}
            className="mb-4 sm:mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] sm:min-h-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to board
          </button>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
            <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 flex-shrink-0 sm:pt-1">
              <UpvoteButton
                upCount={request.up_count}
                downCount={request.down_count}
                voteState={currentVoteState}
                onVote={(type) => handleVote(requestId, currentVoteState, type)}
              />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">{request.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <StatusUpdateDropdown
                    requestId={requestId}
                    currentStatus={request.status}
                    onUpdated={fetchDetail}
                  />
                  {request.category && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {request.category}
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {request.submitter_name ?? 'Anonymous'} ·{' '}
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {request.description}
                </p>
              </div>

              <CommentSection requestId={requestId} userId={user.id} />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit request
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete request
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditRequestSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        request={request}
        onSaved={fetchDetail}
      />

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{request.title}" and all its votes. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteFeatureRequest({ data: { id: requestId } });
                  toast.success('Request deleted');
                  navigate({ to: '/' });
                } catch {
                  toast.error('Failed to delete request');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  );
}
