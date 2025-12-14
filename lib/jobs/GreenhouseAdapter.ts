import { JobAdapter, JobPost } from './types';
import { JobSource } from '@prisma/client';

export class GreenhouseAdapter implements JobAdapter {
  async fetchJobs(source: JobSource): Promise<JobPost[]> {
    if (!source.baseUrl) return [];
    
    let boardToken = '';
    try {
        const url = new URL(source.baseUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // e.g. https://boards.greenhouse.io/airbnb
        if (pathParts.length > 0 && pathParts[0] !== 'embed') {
            boardToken = pathParts[0];
        } else {
            // e.g. https://boards.greenhouse.io/embed/job_board?for=airbnb
            boardToken = url.searchParams.get('for') || '';
        }
    } catch (e) {
        console.error('Invalid URL', source.baseUrl);
        return [];
    }

    if (!boardToken) return [];

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Failed to fetch Greenhouse jobs for ${boardToken}: ${response.statusText}`);
            return [];
        }
        
        const data = await response.json();
        const jobs = data.jobs || [];
        
        return jobs.map((job: any) => ({
            externalId: String(job.id),
            title: job.title,
            company: source.name,
            location: job.location?.name || '',
            description: job.content || '',
            url: job.absolute_url,
            postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
        }));
    } catch (error) {
        console.error('Greenhouse fetch error', error);
        return [];
    }
  }
}
