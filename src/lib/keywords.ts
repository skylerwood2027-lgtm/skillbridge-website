// What a comment keyword sends you, in the words we use on the page. A student
// comments RESUME on a Reel, gets a DM, and lands on /get/resume: "Here's your
// résumé template." Shared by the /get pages and the homepage's Reel row so the
// two never describe the same file differently.
export const shortNames: Record<string, string> = {
  RESUME: 'résumé template',
  EMAIL: 'email template',
  LINKEDIN: 'LinkedIn guide',
  INTERNSHIP: 'application checklist',
  SUMMER: 'summer program list',
  PROJECT: 'project guide',
  NETWORK: 'networking questions',
  SKILLS: 'credential guide',
  // CERTS has no file on this site: the DM sends three course links instead.
  CERTS: 'certificate links',
};

/** "template", "guide", "list": the last word of the short name. */
export const keywordNoun = (keyword: string) => (shortNames[keyword] ?? 'template').split(' ').pop()!;

/** The wording on a download button, by file format. */
export const downloadLabel = (format: string, fallback = 'Download') =>
  ({ docx: 'Download the Word file', pdf: 'Download the PDF' })[format] ?? fallback;
