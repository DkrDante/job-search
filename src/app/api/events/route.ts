import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      let lastChecked = new Date();

      const interval = setInterval(async () => {
        try {
          const newCount = await prisma.job.count({ where: { createdAt: { gt: lastChecked } } });
          const now = new Date();
          if (newCount > 0) {
            const total = await prisma.job.count();
            const payload = JSON.stringify({ newJobs: newCount, total });
            controller.enqueue(encoder.encode(`event: new-jobs\ndata: ${payload}\n\n`));
          }
          lastChecked = now;
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
