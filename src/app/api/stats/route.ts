import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllJobs, toJob } from '@/lib/db/jobs';
import { getApplicationsForUser } from '@/lib/db/applications';
import { getUserProfile } from '@/lib/db/users';
import { scoreJobs } from '@/lib/scorer';
import { DashboardStats, ApplicationStatus } from '@/lib/types';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userId = session.user.id;
    const rows = await getAllJobs();
    const rawJobs = rows.map(row => toJob(row, { relevanceScore: 0, isNew: false }));
    const profile = await getUserProfile(userId);
    const jobs = scoreJobs(rawJobs, profile);
    const applications = await getApplicationsForUser(userId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const newToday = jobs.filter(j => new Date(j.postedAt).getTime() >= todayStart).length;
    const applied = applications.filter(a => a.status === 'applied').length;
    const interviewing = applications.filter(a => a.status === 'interviewing').length;
    const highScoreJobs = jobs.filter(j => j.relevanceScore >= 60).length;
    const matchRate = jobs.length > 0 ? Math.round((highScoreJobs / jobs.length) * 100) : 0;

    const skillCount = new Map<string, number>();
    for (const job of jobs) {
      for (const skill of job.skills) {
        skillCount.set(skill, (skillCount.get(skill) ?? 0) + 1);
      }
    }
    const topSkills = Array.from(skillCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    const sourceCount = new Map<string, number>();
    for (const job of jobs) {
      sourceCount.set(job.source, (sourceCount.get(job.source) ?? 0) + 1);
    }
    const jobsBySource = Array.from(sourceCount.entries()).map(([source, count]) => ({ source, count }));

    const industryCount = new Map<string, number>();
    for (const job of jobs) {
      industryCount.set(job.industry, (industryCount.get(job.industry) ?? 0) + 1);
    }
    const jobsByIndustry = Array.from(industryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([industry, count]) => ({ industry, count }));

    const statusOrder: ApplicationStatus[] = ['bookmarked', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];
    const statusCount = new Map<ApplicationStatus, number>();
    for (const a of applications) {
      statusCount.set(a.status, (statusCount.get(a.status) ?? 0) + 1);
    }
    const applicationFunnel = statusOrder
      .filter(s => statusCount.has(s))
      .map(s => ({ status: s, count: statusCount.get(s) ?? 0 }));

    const recentHighScoreJobs = jobs
      .filter(j => j.relevanceScore >= 70)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    const stats: DashboardStats = {
      totalJobs: jobs.length,
      newToday,
      applied,
      interviewing,
      matchRate,
      topSkills,
      jobsBySource,
      jobsByIndustry,
      applicationFunnel,
      recentHighScoreJobs,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API:stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
