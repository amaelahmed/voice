import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JobsService } from '../JobsService';
import { prisma } from '../../db';

// Mock data
const mockGreenhouseResponse = {
    jobs: [
        {
            id: 123,
            title: 'Senior Engineer',
            absolute_url: 'https://boards.greenhouse.io/airbnb/jobs/123',
            location: { name: 'Remote' },
            content: 'We need a senior engineer...',
            updated_at: '2023-01-01T00:00:00Z'
        }
    ]
};

describe('Job Pipeline', () => {
    beforeEach(async () => {
        // Clear DB
        await prisma.matchScore.deleteMany();
        await prisma.jobListing.deleteMany();
        await prisma.jobSource.deleteMany();
        await prisma.parsedCv.deleteMany();
        await prisma.user.deleteMany();

        // Setup User
        await prisma.user.create({
            data: {
                email: 'test@example.com',
                roleKeyword: 'Engineer',
                parsedCv: {
                    create: {
                        content: 'I am a senior engineer with React and Node experience.',
                        skills: 'React, Node, TypeScript'
                    }
                }
            }
        });

        // Setup Source
        await prisma.jobSource.create({
            data: {
                name: 'Airbnb',
                type: 'GREENHOUSE',
                baseUrl: 'https://boards.greenhouse.io/airbnb'
            }
        });
        
        // Mock fetch
        global.fetch = vi.fn().mockImplementation((url) => {
            if (typeof url === 'string' && url.includes('greenhouse.io')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockGreenhouseResponse),
                    text: () => Promise.resolve(JSON.stringify(mockGreenhouseResponse))
                });
            }
            return Promise.resolve({
                ok: false,
                statusText: 'Not Found'
            });
        }) as any;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('syncs jobs and creates matches', async () => {
        const service = new JobsService();
        await service.sync();

        // Check JobListing created
        const job = await prisma.jobListing.findFirst({
            where: { externalId: '123' }
        });
        expect(job).toBeDefined();
        expect(job?.title).toBe('Senior Engineer');
        expect(job?.company).toBe('Airbnb');

        // Check MatchScore created
        const match = await prisma.matchScore.findFirst({
            where: { jobId: job?.id }
        });
        expect(match).toBeDefined();
        expect(match?.status).toBe('READY_FOR_REVIEW'); 
        // Our AiMatcher mock (when no API key) returns score 0.85 -> READY_FOR_REVIEW
        expect(match?.rationale).toContain('Mock rationale');
    });
});
