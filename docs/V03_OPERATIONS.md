# V0.3 Operations — Reading Sources and Listening Studio

## Upgrade

```bash
./scripts/deploy.sh update
```

Existing `english-mastery` D1 and `english-mastery-media` R2 resources are reused. V0.3 adds migrations 0005 and 0006.

## Reading sources

Open `/platform/sources`. V0.3 seeds 12 reference sources. Select a source, run discovery, then send a discovered URL to Content to create a draft. Webpage discovery ranks article-like links and suppresses common navigation/privacy/authentication links.

## YouTube setup

Create a YouTube Data API v3 key in a Google Cloud project with YouTube Data API v3 enabled. Store it only as a Cloudflare Worker secret:

```bash
npx wrangler secret put YOUTUBE_API_KEY
```

Open `/platform/listening`. YouTube sources will show enabled after refresh.

YouTube source forms accept:

- `@channelhandle`
- `https://www.youtube.com/@channelhandle`
- `https://www.youtube.com/channel/UC...`
- a channel ID beginning with `UC...`

The platform discovers the channel uploads playlist, gets recent videos, checks public/embeddable status and retains Made-for-Kids metadata. It does not download media or scrape captions.

## Podcast setup

No API key is needed. Add a public RSS/Atom feed in `/platform/listening`. The feed must expose an audio enclosure/media URL. Playback streams from the publisher URL.

## Create a listening lesson

1. Select a listening source.
2. Discover latest items.
3. Select **Use item**.
4. Choose P5/P6, topic and listening skills.
5. Optional reliable basis:
   - publisher companion page, or
   - authorised teacher-owned transcript.
6. Create draft.
7. Open Review.
8. Publish.

### Authentic vs guided

**Authentic** is used when only media metadata is available. It creates listening passes, topic vocabulary and reflection prompts, but no scored factual questions.

**Guided** is used only when the system has a reliable text basis. It can create main-idea, detail, inference and purpose/attitude questions.

## Student flow

Open `/learn/listen` and choose a published P5/P6 lesson. The three-pass flow is:

1. overall meaning;
2. detail/inference;
3. review + questions/reflection.

Question attempts update the same D1 XP/progress/mastery path used by reading. Merely marking a media lesson complete awards no XP.

## Troubleshooting

### YouTube says API key is not configured

```bash
npx wrangler secret list
npx wrangler secret put YOUTUBE_API_KEY
```

Then refresh the Admin Listening page.

### A YouTube video is missing

V0.3 intentionally filters private/non-embeddable videos and clips shorter than 45 seconds or longer than 45 minutes by default.

### Podcast feed returns no items

Check that the URL is a direct RSS/Atom feed and includes audio enclosure/media URLs. Some HTML podcast landing pages are not feeds.

### Listening draft has zero questions

That is expected for `metadata_only` authentic lessons. Add a reliable publisher companion page or an authorised transcript if you need scored questions.
