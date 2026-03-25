'use client';

import type { Interview } from '~/lib/db/generated/client';
import type { Row } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { hash as objectHash } from 'ohash';
import { useState } from 'react';
import { createFollowUpInterviewFromDashboard } from '~/actions/interviews';
import { DeleteInterviewsDialog } from '~/app/dashboard/interviews/_components/DeleteInterviewsDialog';
import { ExportInterviewsDialog } from '~/app/dashboard/interviews/_components/ExportInterviewsDialog';
import { Button } from '~/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { useToast } from '~/components/ui/use-toast';

export const ActionsDropdown = ({ row }: { row: Row<Interview> }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedInterviews, setSelectedInterviews] = useState<Interview[]>();
  const { toast } = useToast();

  const handleDelete = (data: Interview) => {
    setSelectedInterviews([data]);
    setShowDeleteModal(true);
  };

  const handleExport = (data: Interview) => {
    setSelectedInterviews([data]);
    setShowExportModal(true);
  };

  const handleResetExport = () => {
    setSelectedInterviews([]);
    setShowExportModal(false);
  };

  // Create Follow Up Action Handling Function
  const handleFollowUp = async () => {
    const result = await createFollowUpInterviewFromDashboard({
      sourceInterviewId: row.original.id,
    });

    if (result.error) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }

    toast({
      description:
        'Follow-up interview created with previous network data pre-loaded.',
    });
  };

  return (
    <>
      <ExportInterviewsDialog
        key={objectHash(selectedInterviews)}
        open={showExportModal}
        handleCancel={handleResetExport}
        interviewsToExport={selectedInterviews!}
      />
      <DeleteInterviewsDialog
        open={showDeleteModal}
        setOpen={setShowDeleteModal}
        interviewsToDelete={selectedInterviews ?? []}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            disabled={!row.original.finishTime}
            onClick={() => void handleFollowUp()}
          >
            Create Follow-Up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(row.original)}>
            Delete
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport(row.original)}>
            Export
          </DropdownMenuItem>
          <Link href={`/interview/${row.original.id}`}>
            <DropdownMenuItem>Enter Interview</DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
