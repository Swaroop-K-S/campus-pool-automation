import { z } from 'zod';

export const ResumeDataSchema = z.object({
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string()
    })
  ),
  projects: z.array(
    z.object({
      title: z.string(),
      techStack: z.array(z.string()),
      description: z.string()
    })
  )
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
