import { OpenAI } from 'openai';
import { prisma } from '../db';

export class AiMatcher {
    private openai: OpenAI | null = null;

    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
    }

    async matchJobs() {
        const users = await prisma.user.findMany({
            include: { parsedCv: true }
        });

        for (const user of users) {
            if (!user.parsedCv) continue;

            // Simple filtering by preferences first?
            const whereClause: any = {
                matches: {
                    none: {
                        userId: user.id
                    }
                }
            };

            if (user.roleKeyword) {
                whereClause.title = {
                    contains: user.roleKeyword // partial match on title (Note: SQLite/Postgres nuances)
                };
            }
            // Location filtering could be added here too

            const jobs = await prisma.jobListing.findMany({
                where: whereClause,
                take: 5 // Process a few at a time to avoid timeouts in serverless
            });

            console.log(`Matching ${jobs.length} jobs for user ${user.email}`);

            for (const job of jobs) {
                const result = await this.calculateScore(user.parsedCv.content, job);
                
                await prisma.matchScore.create({
                    data: {
                        userId: user.id,
                        jobId: job.id,
                        score: result.score,
                        rationale: result.rationale,
                        status: result.score > 0.7 ? 'READY_FOR_REVIEW' : 'PENDING'
                    }
                });
            }
        }
    }

    private async calculateScore(cvText: string, job: any): Promise<{score: number, rationale: string}> {
         if (!this.openai) {
             // Mock response if no API key
             console.log('Mocking AI match for', job.title);
             return {
                 score: 0.85,
                 rationale: 'Mock rationale: Keywords match.'
             };
         }

         const prompt = `
            Job Title: ${job.title}
            Company: ${job.company}
            Location: ${job.location}
            Description: ${job.description?.substring(0, 1000)}... (truncated)
            
            Candidate CV: ${cvText.substring(0, 2000)}... (truncated)
            
            Evaluate the match between the candidate and the job. 
            Return a JSON object with:
            - score: number between 0.0 and 1.0 (float)
            - rationale: string explanation (max 2 sentences)
         `;
         
         try {
             const completion = await this.openai.chat.completions.create({
                 messages: [{ role: 'user', content: prompt }],
                 model: 'gpt-3.5-turbo',
                 response_format: { type: "json_object" }
             });
             
             const content = completion.choices[0].message.content;
             if (!content) throw new Error("No content");
             return JSON.parse(content);
         } catch (e) {
             console.error('AI Match error', e);
             return { score: 0, rationale: 'Error during AI matching' };
         }
    }
}
