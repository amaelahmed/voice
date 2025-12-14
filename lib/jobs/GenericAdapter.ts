import { JobAdapter, JobPost } from './types';
import { JobSource } from '@prisma/client';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';

export class GenericAdapter implements JobAdapter {
  async fetchJobs(source: JobSource): Promise<JobPost[]> {
    if (!source.baseUrl) return [];
    
    try {
        const urlObj = new URL(source.baseUrl);
        const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
        const userAgent = 'Mozilla/5.0 (compatible; JobBot/1.0; +http://example.com/bot)';

        // Check robots.txt
        try {
            const robotsRes = await fetch(robotsUrl);
            if (robotsRes.ok) {
                const robotsTxt = await robotsRes.text();
                const robots = robotsParser(robotsUrl, robotsTxt);
                if (!robots.isAllowed(source.baseUrl, userAgent)) {
                    console.log(`Scraping disallowed by robots.txt for ${source.baseUrl}`);
                    return [];
                }
                const delay = robots.getCrawlDelay(userAgent);
                if (delay) {
                    await new Promise(r => setTimeout(r, delay * 1000));
                }
            }
        } catch (e) {
            // Ignore robots fetch error, proceed with caution
        }

        // Polite delay (minimum 1s)
        await new Promise(r => setTimeout(r, 1000));

        const response = await fetch(source.baseUrl, {
            headers: {
                'User-Agent': userAgent
            }
        });
        if (!response.ok) return [];
        
        const html = await response.text();
        const $ = cheerio.load(html);
        const jobs: JobPost[] = [];
        
        // Strategy 1: Look for JSON-LD JobPosting
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const content = $(el).html();
                if (!content) return;
                
                const data = JSON.parse(content);
                
                // Helper to process a single item or array
                const processItem = (item: any) => {
                    if (item['@type'] === 'JobPosting') {
                        jobs.push({
                            externalId: item.identifier?.value || item.url || crypto.randomUUID(),
                            title: item.title,
                            company: item.hiringOrganization?.name || source.name,
                            location: item.jobLocation?.address?.addressLocality || 
                                      (typeof item.jobLocation === 'string' ? item.jobLocation : '') || '',
                            description: item.description || '',
                            url: item.url || source.baseUrl,
                            postedAt: item.datePosted ? new Date(item.datePosted) : undefined
                        });
                    } else if (item['@graph']) {
                        // Some sites use @graph
                        if (Array.isArray(item['@graph'])) {
                            item['@graph'].forEach(processItem);
                        }
                    }
                };

                if (Array.isArray(data)) {
                    data.forEach(processItem);
                } else {
                    processItem(data);
                }
            } catch (e) {
                // Ignore parse errors
            }
        });

        return jobs;
    } catch (error) {
        console.error('Generic fetch error', error);
        return [];
    }
  }
}

