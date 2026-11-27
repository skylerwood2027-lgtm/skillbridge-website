---
name: add-resource
description: Walk a SkillBridge teammate (usually David) through adding a free resource (a PDF or Word file) to joinskillbridge.com, from picking the file to the page being live. Use when someone says they want to add, upload or put a resource, template, guide or file on the site, or update one that is already there.
---

# Add a resource to joinskillbridge.com

The person you are helping is a high school student, not a developer. Do the technical work
yourself and only ask them about the resource. Ask one question at a time, in plain words,
and wait for the answer. Never ask them to edit JSON or run commands themselves.

The written version of these rules for people is `ADD-A-RESOURCE.md`. The schema rules are
enforced by `scripts/validate-resources.mjs`.

## 1. Check the setup (quietly)

- You must be inside this repo, with `git`, `node` and `npm` available and `gh` signed in
  (`gh auth status`). If something is missing, tell them in one sentence what to install or
  run, and wait.
- Run `git checkout main && git pull`. If there are uncommitted changes that aren't yours,
  stop and ask before touching anything.

## 2. Ask about the resource

Ask these questions one at a time:

1. "Where's the file? Drag it into this window or paste the path." (A PDF or Word file.)
2. "In a sentence or two, what's in it and who is it for?" Then read the file yourself.
3. "Is it for a Reel where people comment a keyword? If so, what's the keyword?" Keywords are
   3 to 16 CAPITAL letters. Read `src/data/resources.json` for the keywords already taken
   (each `cta.keyword`) and say so if theirs is taken.
4. If it replaces a file that's already on the site, ask which one, and update that entry
   and file in place instead of adding a new one. Keep the old file name so old links keep
   working.

## 3. Make the change

1. Work on `main` (you pulled it in step 1). Skyler has approved teammates pushing resource
   changes straight to `main`: it goes live on joinskillbridge.com about 20 seconds after
   the push, so step 4 has to pass first.
2. Copy the file into `public/resources/` as `skillbridge-<short-name>.<ext>`, in lowercase
   with dashes. Never rename, move or delete anything else already in `public/`.
3. Add an entry right after `"resources": [` in `src/data/resources.json`. Copy the shape of
   an existing entry with the same format (for example `teacher-recommendation-email` for
   Word files):
   - Write `title`, `description`, `outcome`, `bestFor` (34 characters at most) and
     `searchTerms` (2 to 6) from what the file and the person say. Don't invent facts,
     numbers or claims.
   - Pick `category` and `group` from the ids already listed at the top of the file.
   - Set `status` to `"published"`, `latest` to `true`, `featured` to `false`, and
     `lastVerified` to today's date.
   - For `cta`, write `{ "keyword": "...", "videoJobId": "<short-name>-reel" }`, or `null`
     when there's no keyword.
   - In `source.note`, say who made it and for which Reel.
4. Read the title, description and outcome back to them, and change anything they don't
   like.

## 4. Check it

1. Run `npm install` if `node_modules` is missing, then `npm run resources:check` and
   `npm run build`. Fix whatever fails. If a check can't run on this computer (for example,
   a missing browser), say so in the commit message and keep going, as long as `build`
   passed.
2. Run `npm run dev`. Confirm that `/resources` shows the new item, that its download link
   returns the file, and that `/get/<keyword>` loads when there's a keyword. Stop the server.

## 5. Put it live

1. Push only if `resources:check` and `build` both passed. If either failed and you can't
   fix it, don't push; tell them what's wrong in one sentence and to send it to Skyler.
2. Commit only the new file, `src/data/resources.json` and anything the check regenerated
   (`src/data/resource-stats.json`). Never commit other files, never force-push, and never
   rewrite history.
3. `git pull --rebase`, then `git push origin main`. The "never push" rule in CLAUDE.md
   doesn't block this resource-only push, because Skyler approved it.
4. Wait about 30 seconds, then check that the file URL and `/resources` (and `/get/<keyword>`
   when there's one) return 200 on `https://www.joinskillbridge.com`. If they don't after
   2 minutes, tell them to let Skyler know.
5. Give them a one-line summary and the live links. If there's a keyword, the DM button link
   for CreatorFlow is `https://www.joinskillbridge.com/get/<keyword>`.
