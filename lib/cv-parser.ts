import { Buffer } from "buffer";

export interface ParsedCvData {
  headline?: string;
  summary?: string;
  experiences: {
    jobTitle: string;
    company: string;
    location?: string;
    startDate?: Date;
    endDate?: Date;
    current?: boolean;
    description?: string;
  }[];
  skills: {
    name: string;
    proficiency?: string;
  }[];
  educations: {
    degree: string;
    fieldOfStudy?: string;
    school: string;
    startDate?: Date;
    endDate?: Date;
    activities?: string;
  }[];
}

/**
 * Parse a CV file buffer into structured data
 * Uses resume-parser for PDF/DOCX parsing
 */
export async function parseCv(
  buffer: Buffer,
  _fileName: string,
  _mimeType: string
): Promise<ParsedCvData> {
  try {
    // Try to use resume-parser if available
    // For development, we'll create a stub parser
    const parsedData = await parseWithStubParser(buffer);
    return parsedData;
  } catch (error) {
    console.error("CV parsing error:", error);
    throw new Error(
      "Failed to parse CV: " +
        (error instanceof Error ? error.message : "Unknown error")
    );
  }
}

/**
 * Stub parser that extracts basic information from CV
 * In production, integrate with resume-parser or LangChain + OpenAI
 */
async function parseWithStubParser(
  buffer: Buffer
): Promise<ParsedCvData> {
  // Extract text from buffer
  // This is a simplified implementation
  const text = buffer.toString("utf-8").substring(0, 5000); // First 5000 chars
  
  // Basic regex patterns to extract information
  const result: ParsedCvData = {
    headline: extractHeadline(text),
    summary: extractSummary(text),
    experiences: extractExperiences(text),
    skills: extractSkills(text),
    educations: extractEducations(text),
  };
  
  return result;
}

function extractHeadline(text: string): string | undefined {
  // Look for common headline patterns
  const headlines = text.match(/(?:Title|Position|Role|Profile)\s*:?\s*([^\n]+)/i);
  if (headlines) {
    return headlines[1].trim();
  }
  
  // Try to find from the beginning (often first line or near the top)
  const lines = text.split("\n");
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 10 && line.length < 100) {
      return line;
    }
  }
  
  return "Professional";
}

function extractSummary(text: string): string | undefined {
  const summaryMatch = text.match(
    /(?:Summary|About|Professional\s+Summary|Objective)\s*:?\s*([^\n]+(?:\n[^\n]+)*?)(?:\n\n|\nExperience|\nSkill)/i
  );
  
  if (summaryMatch) {
    return summaryMatch[1].trim().substring(0, 500);
  }
  
  return undefined;
}

function extractExperiences(text: string): ParsedCvData["experiences"] {
  const experiences: ParsedCvData["experiences"] = [];
  
  // Look for experience section
  const experienceSection = text.match(
    /(?:Experience|Work\s+History|Professional\s+Experience)\s*:?([\s\S]*?)(?:\n\n|Skill|Education|$)/i
  );
  
  if (!experienceSection) {
    return experiences;
  }
  
  const sectionText = experienceSection[1];
  
  // Split by common job entry patterns
  const jobEntries = sectionText.split(/(?=\n(?:[A-Z]|\d))/);
  
  for (const entry of jobEntries) {
    const jobTitleMatch = entry.match(/([A-Za-z\s]+(?:Engineer|Manager|Developer|Analyst|Designer|Architect|Consultant|Officer|Specialist|Lead|Head|Chief|Director|VP|President))/i);
    const companyMatch = entry.match(/at\s+([^\n]+)|([^\n]+)\s+(?:\(|,|\||–|-)/i);
    
    if (jobTitleMatch) {
      experiences.push({
        jobTitle: jobTitleMatch[1].trim(),
        company: companyMatch ? companyMatch[1].trim() : "Company",
        description: entry.substring(0, 200).trim(),
      });
    }
  }
  
  return experiences.slice(0, 5); // Limit to 5 experiences
}

function extractSkills(text: string): ParsedCvData["skills"] {
  const skills: ParsedCvData["skills"] = [];
  
  // Look for skills section
  const skillsSection = text.match(
    /(?:Skills|Technical\s+Skills|Core\s+Competencies)\s*:?([\s\S]*?)(?:\n\n|Education|Experience|$)/i
  );
  
  if (!skillsSection) {
    return skills;
  }
  
  const sectionText = skillsSection[1];
  
  // Split by common delimiters
  const skillList = sectionText
    .split(/[,•\n|–-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 50);
  
  for (const skill of skillList.slice(0, 15)) {
    // Extract proficiency if available
    const proficiencyMatch = skill.match(/(Expert|Advanced|Intermediate|Beginner|Proficient)/i);
    
    skills.push({
      name: skill.replace(/(Expert|Advanced|Intermediate|Beginner|Proficient)/i, "").trim(),
      proficiency: proficiencyMatch ? proficiencyMatch[1] : undefined,
    });
  }
  
  return skills;
}

function extractEducations(text: string): ParsedCvData["educations"] {
  const educations: ParsedCvData["educations"] = [];
  
  // Look for education section
  const educationSection = text.match(
    /(?:Education|Academic\s+Background)\s*:?([\s\S]*?)(?:\n\n|Certification|Experience|$)/i
  );
  
  if (!educationSection) {
    return educations;
  }
  
  const sectionText = educationSection[1];
  
  // Look for degree patterns
  const degrees = sectionText.match(
    /(?:Bachelor|Master|PhD|Associate|Diploma|Certificate)[^,\n]*/gi
  );
  
  if (!degrees) {
    return educations;
  }
  
  // Extract universities
  const universities = sectionText.match(
    /(?:University|College|Institute|School)[^,\n]*/gi
  );
  
  for (let i = 0; i < Math.min(degrees.length, 3); i++) {
    educations.push({
      degree: degrees[i].trim(),
      school: universities && universities[i] ? universities[i].trim() : "University",
      fieldOfStudy: extractFieldOfStudy(degrees[i]),
    });
  }
  
  return educations;
}

function extractFieldOfStudy(degreeText: string): string | undefined {
  // Common field patterns after degree
  const fieldMatch = degreeText.match(/(?:in|of)\s+([^,\n]+)/i);
  return fieldMatch ? fieldMatch[1].trim() : undefined;
}
