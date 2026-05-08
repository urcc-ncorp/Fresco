import 'server-only';
import { createCachedFunction } from '~/lib/cache';
import { prisma } from '~/lib/db';

export const getInterviews = createCachedFunction(async () => {
  const interviews = await prisma.interview.findMany({
    include: {
      protocol: true,
      participant: true,
      sourceInterview: {
        select: { id: true },
      },
    },
  });
  return interviews;
}, ['getInterviews']);

export type GetInterviewsReturnType = ReturnType<typeof getInterviews>;

export const getInterviewsForExport = async (interviewIds: string[]) => {
  const interviews = await prisma.interview.findMany({
    where: {
      id: {
        in: interviewIds,
      },
    },
    include: {
      protocol: true,
      participant: true,
    },
  });
  return interviews;
};

export const getInterviewById = (interviewId: string) =>
  createCachedFunction(
    async (interviewId: string) => {
      const interview = await prisma.interview.findUnique({
        where: {
          id: interviewId,
        },
        include: {
          protocol: {
            include: {
              assets: true,
            },
          },
        },
      });

      return interview;
    },
    [`getInterviewById-${interviewId}`, 'getInterviewById'],
  )(interviewId);

export const getLatestCompletedInterview = async (
  participantId: string,
  protocolId: string,
) => {
  const interview = await prisma.interview.findFirst({
    where: {
      participantId,
      protocolId,
      finishTime: { not: null },
    },
    orderBy: { finishTime: 'desc' },
    select: {
      id: true,
      network: true,
      protocolId: true,
      participantId: true,
      followUpLabel: true,
    },
  });
  return interview;
};
