import { NextRequest, NextResponse } from 'next/server';
import { getJobs } from '@/lib/store';

// ─── Server-Sent Events for real-time new job notifications ──────────────────
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connected event
      controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

      let lastCount = getJobs().length;
      let lastNewCount = getJobs().filter(j => j.isNew).length;

      // Poll every 30 seconds for new jobs
      const interval = setInterval(() => {
        try {
          const jobs = getJobs();
          const newCount = jobs.filter(j => j.isNew).length;

          if (newCount > lastNewCount) {
            const diff = newCount - lastNewCount;
            const payload = JSON.stringify({ newJobs: diff, total: jobs.length });
            controller.enqueue(encoder.encode(`event: new-jobs\ndata: ${payload}\n\n`));
          }

          lastCount = jobs.length;
          lastNewCount = newCount;
        } catch {
          clearInterval(interval);
        }
      }, 30000);

      // Cleanup on disconnect
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
      'Connection': 'keep-alive',
    },
  });
}
