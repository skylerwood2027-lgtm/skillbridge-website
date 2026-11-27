// One-time setup for the daily Reel update (.github/workflows/update-reels.yml).
// Skyler runs this in his own terminal:  node scripts/connect-instagram.mjs
//
// It signs in through the SkillBridge Meta app, checks the token can read Reel
// views and never expires, and saves IG_TOKEN and IG_USER_ID as GitHub repo
// secrets with `gh secret set`. The token and app secret are never printed or
// written to disk.
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';

const GRAPH = 'https://graph.facebook.com/v27.0';
const REPO = 'skylerwood2027-lgtm/skillbridge-website';
const REDIRECT = 'https://www.joinskillbridge.com/';
const NEEDED = ['instagram_basic', 'instagram_manage_insights'];

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function get(url, token) {
  const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  return body;
}

function setSecret(name, value) {
  const r = spawnSync('gh', ['secret', 'set', name, '--repo', REPO], { input: value, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`gh secret set ${name} failed: ${r.stderr.trim()}`);
  console.log(`  Saved ${name} to GitHub.`);
}

console.log('\nConnect Instagram stats for the daily Reel update.\n');
const appId = await ask('Meta App ID: ');
const configId = await ask('Configuration ID (the "Website stats" one): ');
const appSecret = await ask('App secret (hidden as you paste): ', { hidden: true });

const login = new URL('https://www.facebook.com/dialog/oauth');
login.searchParams.set('client_id', appId);
login.searchParams.set('config_id', configId);
login.searchParams.set('redirect_uri', REDIRECT);
login.searchParams.set('response_type', 'code');
login.searchParams.set('override_default_response_type', 'true');
console.log(`\n1. Open this link, sign in, and allow access for @realskillbridge:\n\n${login}\n`);
console.log('2. You land on joinskillbridge.com. Copy the whole address from the address bar.\n');
const landed = await ask('Paste that address here: ');
const code = new URL(landed).searchParams.get('code');
if (!code) throw new Error('That address has no ?code= in it. Run this again and copy the full address.');

const exchange = new URL(`${GRAPH}/oauth/access_token`);
exchange.searchParams.set('client_id', appId);
exchange.searchParams.set('client_secret', appSecret);
exchange.searchParams.set('redirect_uri', REDIRECT);
exchange.searchParams.set('code', code);
const { access_token: token } = await get(exchange);
if (!token) throw new Error('Meta returned no token.');

const debug = new URL(`${GRAPH}/debug_token`);
debug.searchParams.set('input_token', token);
debug.searchParams.set('access_token', `${appId}|${appSecret}`);
const info = (await get(debug)).data ?? {};
const missing = NEEDED.filter((p) => !(info.scopes ?? []).includes(p));
if (missing.length) throw new Error(`The token is missing ${missing.join(', ')}. Add it to the configuration and run this again.`);
if (info.expires_at) {
  console.log(`\nNote: this token expires ${new Date(info.expires_at * 1000).toDateString()}. Set the configuration's expiration to "Never" to avoid redoing this.`);
}

const accounts = (await get(`${GRAPH}/me/assigned_instagram_accounts?fields=id,username`, token)).data ?? [];
const account = accounts.find((a) => a.username === 'realskillbridge') ?? accounts[0];
if (!account) throw new Error('No Instagram account was shared. Run this again and pick @realskillbridge on the login screens.');

// Prove the job will work before saving anything: read one Reel's views.
const media = (await get(`${GRAPH}/${account.id}/media?fields=id,permalink,media_product_type&limit=25`, token)).data ?? [];
const reel = media.find((m) => m.media_product_type === 'REELS');
if (!reel) throw new Error('No Reels came back for this account.');
const ins = (await get(`${GRAPH}/${reel.id}/insights?metric=views`, token)).data ?? [];
const views = ins[0]?.total_value?.value ?? ins[0]?.values?.[0]?.value;
console.log(`\nWorks: @${account.username}'s newest Reel (${reel.permalink}) has ${views} views.\n`);

setSecret('IG_TOKEN', token);
setSecret('IG_USER_ID', String(account.id));
console.log('\nDone. The daily update can run now.\n');
