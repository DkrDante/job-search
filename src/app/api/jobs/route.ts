import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllJobs, getLastRefreshed, getViewedJobIds, toJob } from '@/lib/db/jobs';
import { getUserProfile } from '@/lib/db/users';
import { scoreJobs } from '@/lib/scorer';
import { Job, JobsQueryParams, PaginatedJobsResponse } from '@/lib/types';
import { DEFAULT_PAGE_SIZE } from '@/config/defaults';

function filterJobs(jobs: Job[], params: JobsQueryParams): Job[] {
  // unchanged from the existing implementation
  return jobs.filter(job => {
    if (params.q) {
      const q = params.q.toLowerCase();
      const searchText = `${job.title} ${job.company} ${job.description} ${job.skills.join(' ')}`.toLowerCase();
      if (!searchText.includes(q)) return false;
    }
    if (params.location) {
      const loc = params.location.toLowerCase();
      if (!job.location.toLowerCase().includes(loc)) return false;
    }
    if (params.remote && job.remote !== params.remote) return false;
    if (params.level && job.experienceLevel !== params.level) return false;
    if (params.industry && job.industry !== params.industry) return false;
    if (params.source && job.source !== params.source) return false;
    if (params.minSalary && job.salary) {
      if ((job.salary.min ?? 0) < params.minSalary) return false;
    }
    if (params.jobType && job.jobType !== params.jobType) return false;
    if (params.isNew !== undefined && job.isNew !== params.isNew) return false;
    return true;
  });
}

function sortJobs(jobs: Job[], sort: string = 'relevance', order: string = 'desc'): Job[] {
  const sorted = [...jobs].sort((a, b) => {
    switch (sort) {
      case 'date':
        return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      case 'salary':
        return (b.salary?.min ?? 0) - (a.salary?.min ?? 0);
      case 'company':
        return a.company.localeCompare(b.company);
      case 'relevance':
      default:
        return b.relevanceScore - a.relevanceScore;
    }
  });
  return order === 'asc' ? sorted.reverse() : sorted;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const params: JobsQueryParams = {
      q: searchParams.get('q') || undefined,
      location: searchParams.get('location') || undefined,
      remote: (searchParams.get('remote') as any) || undefined,
      level: (searchParams.get('level') as any) || undefined,
      industry: (searchParams.get('industry') as any) || undefined,
      source: (searchParams.get('source') as any) || undefined,
      minSalary: searchParams.get('minSalary') ? Number(searchParams.get('minSalary')) : undefined,
      jobType: (searchParams.get('jobType') as any) || undefined,
      sort: (searchParams.get('sort') as any) || 'relevance',
      order: (searchParams.get('order') as any) || 'desc',
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? DEFAULT_PAGE_SIZE),
      isNew: searchParams.get('isNew') === 'true' ? true : undefined,
    };

    let rows = await getAllJobs();
    if (rows.length === 0) {
      const { runAggregation } = await import('@/lib/aggregator');
      await runAggregation();
      rows = await getAllJobs();
    }

    const viewedMap = await getViewedJobIds(userId, rows.map(r => r.id));
    const profile = await getUserProfile(userId);
    const unscored = rows.map(row =>
      toJob(row, {
        relevanceScore: 0,
        isNew: !viewedMap.has(row.id),
        viewedAt: viewedMap.get(row.id),
      })
    );
    const jobs = scoreJobs(unscored, profile);

    const filtered = filterJobs(jobs, params);
    const sorted = sortJobs(filtered, params.sort, params.order);
    const total = sorted.length;
    const page = params.page ?? 1;
    const limit = params.limit ?? DEFAULT_PAGE_SIZE;
    const paginated = sorted.slice((page - 1) * limit, page * limit);

    const response: PaginatedJobsResponse = {
      jobs: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      lastRefreshed: await getLastRefreshed(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API:jobs] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
