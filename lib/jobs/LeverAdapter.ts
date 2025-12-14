import { JobAdapter, JobPost } from './types';
import { JobSource } from '@prisma/client';

export class LeverAdapter implements JobAdapter {
  async fetchJobs(source: JobSource): Promise<JobPost[]> {
    if (!source.baseUrl) return [];
    
    let company = '';
    try {
        const url = new URL(source.baseUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        // e.g. https://jobs.lever.co/airbnb
        if (pathParts.length > 0) {
            company = pathParts[0];
        }
    } catch (e) {
        console.error('Invalid URL', source.baseUrl);
        return [];
    }

    if (!company) return [];

    const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error(`Failed to fetch Lever jobs for ${company}: ${response.statusText}`);
            return [];
        }
        
        const jobs = await response.json();
        
        return jobs.map((job: any) => ({
            externalId: String(job.id),
            title: job.text,
            company: source.name,
            location: job.categories?.location || '',
            description: job.descriptionPlain || job.description || '',
            url: job.hostedUrl,
            postedAt: job.createdAt ? new Date(job.createdAt) : undefined,
        }));
    } catch (error) {
        console.error('Lever fetch error', error);
        return [];
    }
  }
}
