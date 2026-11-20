# YouTube Tag Extractor 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 让 YouTube Tag Extractor 能从一个输入读取视频或频道链接，返回全部可复制的标签/关键词。

**架构：** 复用 thumbnail tool 的服务端模式，在 `src/lib/youtube-tags.ts` 里先验证并规范化链接，再由 Elysia 端点只请求 YouTube 官方页面并解析 `meta name=keywords`。Svelte 组件用 Eden client 调用端点，显示 chip 列表和“Salin semua”。

**技术栈：** SvelteKit 3 / Svelte 5 runes，Elysia 2 RC + Eden Treaty，TypeScript strict，Vitest，Tailwind class，Bun 1.4.4。

**规格：** `docs/superpowers/specs/2026-11-20-youtube-tags-design.md`

## 全局约束

- 不新增依赖；不引入 API key、数据库、认证或存储。
- 输入只能是 YouTube 域名：host 用 allowlist，协议只 http/https；不允许 fetch 用户提供的任意 URL。
- 视频链接走现有 `parseVideoId`；频道只支持 `/@handle`、`/channel/UC...`、`/user/...`、`/c/...`，可选 `/about`，并对路径段做 regex 校验。
- API 响应错误一律 `problem+json`；网络错误 502，未知链接 400，内容不可用 404，限额 429。
- 复用现有 `rateLimiter`，不创建新实例。
- UI 文案 Bahasa Indonesia、组件 Svelte 5 runes、导入走 `#lib`，不写新颜色 token。

## 审查重点（Review Focus）

- `https://youtube.com.evil.com/watch?v=...` 或 `javascript:` → 必须 400，且不能发 upstream request。
- `https://www.youtube.com/@handle` 和 `https://www.youtube.com/channel/UC...` → 必须识别为 channel 并请求对应 channel 页面。
- channel HTML 没有 `playabilityStatus` → 必须按 channel 标记识别，不能误报 blocked。
- 无 keywords 的公开页面 → 必须返回 `state: 'hidden'` 和空 tags，UI 给出明确说明。
- 用户连续点击或接口 429 → UI 显示 `detail`，不能清空为空成功态。

---

### 任务 1：扩展纯解析器

**文件：**

- 修改：`src/lib/youtube-tags.ts`
- 测试：`src/lib/youtube-tags.spec.ts`

- [ ] **步骤 1：写失败测试**

在 `src/lib/youtube-tags.spec.ts` 增加以下断言（保留现有测试）：

```ts
import { parseWatchPageTags, parseYouTubeTarget } from './youtube-tags.ts'

expect(parseYouTubeTarget('https://www.youtube.com/@MrBeast')).toEqual({
	kind: 'channel',
	url: 'https://www.youtube.com/@MrBeast',
})
expect(parseYouTubeTarget('https://www.youtube.com/@MrBeast/about')).toEqual({
	kind: 'channel',
	url: 'https://www.youtube.com/@MrBeast',
})
expect(parseYouTubeTarget('https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA')).toEqual({
	kind: 'channel',
	url: 'https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA',
})
expect(parseYouTubeTarget('https://youtu.be/dQw4w9WgXcQ')).toEqual({
	kind: 'video',
	url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
})
expect(parseYouTubeTarget('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
expect(parseYouTubeTarget('javascript:alert(1)')).toBeNull()
expect(parseYouTubeTarget('https://www.youtube.com/@bad handle')).toBeNull()

const channelHtml =
	'<script>var ytInitialData = {"channelMetadataRenderer":{}};</script>' +
	'<meta name="keywords" content="mrbeast6000, beast, mrbeast, Mr.Beast, mr">'
expect(parseWatchPageTags(channelHtml, 'channel')).toEqual({
	state: 'ok',
	tags: ['mrbeast6000', 'beast', 'mrbeast', 'Mr.Beast', 'mr'],
})
expect(parseWatchPageTags('<html>consent wall</html>', 'channel')).toEqual({
	state: 'blocked',
	tags: [],
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`bun run test src/lib/youtube-tags.spec.ts`
预期：FAIL，`parseYouTubeTarget is not a function` / channel mode 断言不匹配。

- [ ] **步骤 3：实现解析器**

在 `src/lib/youtube-tags.ts` 实现并导出：

```ts
export function parseYouTubeTarget(input: string): { kind: 'video' | 'channel'; url: string } | null
export function parseWatchPageTags(html: string, mode?: 'video' | 'channel'): WatchPageTagResult
```

规则：

- `kind: 'video'`：优先用 `parseVideoId(input.trim())`；成功时 `url` 固定为 `https://www.youtube.com/watch?v=<id>`。
- `kind: 'channel'`：只接受 `youtube.com` / `www.youtube.com` / `m.youtube.com` / `music.youtube.com` 的 http/https URL；`/@handle` 的 handle 用 `/^@?[\w.-]{1,50}$/`，`/channel/UC...` 用 `/^UC[\w-]{20,22}$/`，`/user/...` 和 `/c/...` 用 `/^[\w.-]{1,50}$/`；可去掉末尾 `/about`；最终 URL 用 `encodeURIComponent` 拼接。
- `mode` 默认 `video`，行为保持当前实现；`channel` 模式把“缺 `channelMetadataRenderer`”当作 `blocked`，不再查 `playabilityStatus`。
- 关键词解析、HTML entity decode、trim、dedupe 继续复用现有逻辑。

- [ ] **步骤 4：运行测试确认通过**

运行：`bun run test src/lib/youtube-tags.spec.ts`
预期：PASS，所有新旧断言通过。

- [ ] **步骤 5：Commit**

```bash
git add src/lib/youtube-tags.ts src/lib/youtube-tags.spec.ts
git commit -m "feat: parse YouTube video and channel tag targets"
```

---

### 任务 2：添加 tags API 端点

**文件：**

- 修改：`src/lib/server/api/index.ts`
- 测试：`src/lib/server/api/index.spec.ts`

- [ ] **步骤 1：写失败测试**

在 `src/lib/server/api/index.spec.ts` 增加：

```ts
function tags(url: string, ip: string) {
	return app.handle(
		new Request('http://localhost/api/tools/youtube-tags', {
			method: 'POST',
			headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
			body: JSON.stringify({ url }),
		}),
	)
}

test('returns channel keywords from a YouTube channel page', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () =>
				new Response(
					'<script>channelMetadataRenderer</script>' +
						'<meta name="keywords" content="mrbeast6000, beast, mrbeast">',
				),
		),
	)
	const response = await tags('https://www.youtube.com/@MrBeast', '10.0.2.1')
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({
		kind: 'channel',
		state: 'ok',
		tags: ['mrbeast6000', 'beast', 'mrbeast'],
	})
})

test('returns video tags from a watch page', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () =>
				new Response(
					'<script>"playabilityStatus":{"status":"OK"}</script>' +
						'<meta name="keywords" content="rick astley, rickroll">',
				),
		),
	)
	const response = await tags('https://youtu.be/dQw4w9WgXcQ', '10.0.2.2')
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({
		kind: 'video',
		state: 'ok',
		tags: ['rick astley', 'rickroll'],
	})
})

test('returns hidden state with no tags', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => new Response('<script>"playabilityStatus":{"status":"OK"}</script>')),
	)
	const response = await tags('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '10.0.2.3')
	expect(response.status).toBe(200)
	expect(await response.json()).toEqual({ kind: 'video', state: 'hidden', tags: [] })
})

test('rejects non-YouTube links without fetching', async () => {
	const fetcher = vi.fn()
	vi.stubGlobal('fetch', fetcher)
	const response = await tags('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', '10.0.2.4')
	expect(response.status).toBe(400)
	expect(fetcher).not.toHaveBeenCalled()
})

test('maps upstream failure to 502 problem+json', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async () => {
			throw new TypeError('network down')
		}),
	)
	const response = await tags('https://www.youtube.com/@MrBeast', '10.0.2.5')
	expect(response.status).toBe(502)
	expect(response.headers.get('content-type')).toBe('application/problem+json')
})
```

- [ ] **步骤 2：运行测试确认失败**

运行：`bun run test src/lib/server/api/index.spec.ts`
预期：FAIL，路由 404。

- [ ] **步骤 3：实现端点**

在 `src/lib/server/api/index.ts` 增加 `.post('/tools/youtube-tags', { ... }, handler)`，沿用现有 `problemSchema`、rate limit、security headers 模式：

- body: `t.Object({ url: t.String({ minLength: 1, maxLength: 500 }) })`。
- response: 200 为 `t.Object({ kind: t.Union([t.Literal('video'), t.Literal('channel')]), state: t.Union([t.Literal('ok'), t.Literal('hidden')]), tags: t.Array(t.String()) })`；400/404/429/502 为 `problemSchema`。
- handler 顺序：rate limit → `parseYouTubeTarget` → `fetch(target.url, { signal: AbortSignal.timeout(8_000) })` → `parseWatchPageTags(html, target.kind)`。
- `!response.ok` → 404；fetch 抛错或 `state === 'blocked'` → 502；`state === 'unavailable'` → 404；其余返回 `{ kind, state, tags }`。

- [ ] **步骤 4：运行测试确认通过**

运行：`bun run test src/lib/server/api/index.spec.ts`
预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add src/lib/server/api/index.ts src/lib/server/api/index.spec.ts
git commit -m "feat: add YouTube tags API endpoint"
```

---

### 任务 3：UI、状态与文档

**文件：**

- 创建：`src/lib/components/tools/YoutubeTagsTool.svelte`
- 修改：`src/routes/tools/[slug]/+page.svelte`
- 修改：`src/lib/tools.ts`
- 修改：`README.md`
- 修改：`AGENTS.md`
- 修改：`src/lib/youtube-tags.spec.ts`（格式修复）

- [ ] **步骤 1：写最小 UI 检查**

运行：`bun run check`（此时还没有组件，预期 PASS；本任务的检查来自 typecheck + endpoint tests + 手动 dev 请求）。在组件完成后运行：

```bash
bun run check
bun run test
```

预期：0 errors / 0 warnings，26+ tests PASS。

- [ ] **步骤 2：实现组件**

创建 `src/lib/components/tools/YoutubeTagsTool.svelte`，照 `YoutubeThumbnailTool.svelte` 的结构：

- `let url = $state('')`、`loading`、`errorMessage`、`result`。
- submit 调 `eden.api.tools['youtube-tags'].post({ url: url.trim() })`，错误时读 `response.error.value.detail`。
- 成功时显示 chip 列表（每个 tag 一个 `<span class="badge">`），并放一个“Salin semua”按钮：`navigator.clipboard.writeText(result.tags.join(', '))`，成功短暂显示“Tersalin”。
- `state === 'hidden'` 时显示“Tidak ada tag yang terlihat pada halaman ini.”；无 error 且无 result 时显示空状态提示。
- 不新增 CSS token，不复用 thumbnail tool 的组件（结果形态不同）。

- [ ] **步骤 3：接线到页面并更新状态**

在 `src/routes/tools/[slug]/+page.svelte` 的 `{#if}` 加分支：`data.tool.slug === 'youtube-tags'` 渲染 `<YoutubeTagsTool placeholder={data.tool.placeholder} />`。
在 `src/lib/tools.ts` 把 `youtube-tags` 的 `status` 改为 `'live'`，placeholder 改为 `https://www.youtube.com/watch?v=... atau https://www.youtube.com/@channel`，capabilities 提到 video + channel。
在 `README.md` 把 YouTube Tag Extractor 行改为 Aktif，并更新描述提到 channel。
在 `AGENTS.md`：Overview 的 live/soon 列表加入 tags；Decided tool rules 的 tags 规则改为“public watch/channel page metadata”。

- [ ] **步骤 4：修格式并跑完整 gate**

运行：`bunx --bun oxfmt src/lib/youtube-tags.spec.ts && bun run verify`
预期：`format:check` PASS，`verify` exit 0。

- [ ] **步骤 5：Manual smoke**

运行 `bun run dev`，请求 `/tools/youtube-tags` 返回 200 且页面有“Salin semua”相关脚本标记；POST `http://localhost:5173/api/tools/youtube-tags` 带 `https://www.youtube.com/@MrBeast` 返回 200 且 tags 数组非空。停止 dev server。

- [ ] **步骤 6：Commit**

```bash
git add src/lib/components/tools/YoutubeTagsTool.svelte src/routes/tools/[slug]/+page.svelte src/lib/tools.ts README.md AGENTS.md src/lib/youtube-tags.spec.ts
git commit -m "feat: ship YouTube tag extractor UI and status"
```
