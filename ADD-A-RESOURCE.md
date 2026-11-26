# How to add a resource to joinskillbridge.com

You can do all of this on the GitHub website. You don't need to install anything.
Skyler gets a request when you finish. He clicks Merge and the site updates in about 20 seconds.
If something is typed wrong, the site doesn't break. It just keeps the old version until it's fixed.

## 1. Upload the file

1. Open the repo on GitHub and go to the `public/resources` folder.
2. Click **Add file → Upload files** and drag your file in (PDF or Word).
3. Before uploading, rename it in lowercase with dashes and no spaces, like
   `skillbridge-cold-email-template.docx`.
4. At the bottom, choose **Create a new branch for this commit**. Name the branch after the
   resource, like `add-cold-email`, then click **Propose changes**.

Its link will be `joinskillbridge.com/resources/<your-file-name>`.

## 2. Add the resource to the list

1. On **your branch** (check the branch dropdown at the top left), open
   `src/data/resources.json` and click the pencil to edit.
2. Find the line `"resources": [`. Paste the template below on the line right after it.
3. Fill in every value in quotes. Keep the quotes, and keep the comma after the closing `},`.
4. Click **Commit changes** and stay on your branch.

```json
    {
      "id": "cold-email-template",
      "slug": "cold-email-template",
      "status": "published",
      "title": "10/10 Cold Email Template",
      "description": "Two sentences on what's inside the file.",
      "outcome": "One sentence: what the student can do after using it.",
      "category": "applying",
      "format": "docx",
      "action": {
        "label": "Download template",
        "url": "/resources/skillbridge-cold-email-template.docx",
        "download": true
      },
      "friction": ["no-account", "editable"],
      "source": { "kind": "video-template", "note": "Made by David for the cold email Reel, Nov 2026." },
      "lastVerified": "2026-11-25",
      "cta": { "keyword": "COLD", "videoJobId": "cold-email-reel" },
      "featured": false,
      "latest": true,
      "group": "apply",
      "bestFor": "Emailing someone you don't know",
      "searchTerms": ["cold email", "email template", "reach out"]
    },
```

### What to put in each field

| Field | What it takes |
|---|---|
| `id` and `slug` | The same short name in lowercase with dashes. It can't match an existing one. |
| `category` | One of these: `resume`, `applying`, `experience`, `networking`, `credentials`, `ai`, `toolkit` |
| `group` | One of these: `apply`, `experience`, `skills` |
| `format` | `docx` for Word, `pdf` for PDF |
| `action.label` | Button text, like `Download template` or `Download PDF` |
| `action.url` | `/resources/` plus your exact file name from step 1 |
| `friction` | Use `["no-account"]`, and add `"editable"` for Word files they fill in |
| `lastVerified` | Today's date, written year-month-day |
| `cta` | Only for a Reel with a comment keyword. The keyword is 3 to 16 CAPITAL letters and can't already be in use (RESUME, EMAIL, LINKEDIN, INTERNSHIP, SUMMER, PROJECT, NETWORK, SKILLS and CERTS are taken). With no keyword, write `"cta": null,` |
| `bestFor` | 34 characters at most. It finishes the phrase "Best for..." |
| `searchTerms` | 2 to 6 words or phrases a student might type to find it |

A keyword automatically gets its own DM page at `joinskillbridge.com/get/<keyword>`, for example
`/get/cold`. That's the link to put in the CreatorFlow DM button.

## 3. Send it to Skyler

1. GitHub shows a yellow bar that says **Compare & pull request**. Click it, then click
   **Create pull request**.
2. Text Skyler the link.
3. Skyler merges it with **Create a merge commit**, not Squash. The site updates about 20 seconds later.

To change a resource that's already up, follow the same steps but edit the file or its entry
instead of adding a new one.
