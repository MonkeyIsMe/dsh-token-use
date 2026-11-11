window.__ModuleLoader__.load({
	id: '@local/dsh-token-stats',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		/** Private Connection channel owned by the Host half. */
		const CHANNEL = '/dsh-token-usage';
		const ENDPOINT = 'summary';
		/** Dictionary namespace owned by this plugin. */
		const NS = 'dsh-token-usage';
		const REFRESH_MS = 10000;
		const CHART_WIDTH = 720;
		const CHART_HEIGHT = 200;
		const WEEKDAYS = ['dow.0', 'dow.1', 'dow.2', 'dow.3', 'dow.4', 'dow.5', 'dow.6'];

		const CSS_ID = '@local/dsh-token-stats/tab.css';
		const CSS = [
			'.dtu-root{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;width:94%;margin:0 auto;max-height:100%;overflow:auto;padding:16px;box-sizing:border-box;color:var(--dsw-alias-label-primary)}',
		/* 大屏仪表盘网格(>=1280px)：今日卡占整行、内部 图表|矩阵 分栏；每日用量在左，按模型+总览在右上下堆叠，各时段用量单独一行垫底；窄屏自动退回单列 */
		'@media (min-width:1280px){.dtu-root{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.dtu-head,.dtu-stats,.dtu-foot,.dtu-root>.dtu-card:nth-child(3){grid-column:1/-1}.dtu-root>.dtu-card:nth-child(3){display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:20px;row-gap:8px;align-items:center}.dtu-root>.dtu-card:nth-child(3)>.dtu-card-head{grid-column:1/-1}.dtu-root>.dtu-card:nth-child(3)>.dtu-chart{grid-column:1;grid-row:2;display:flex;align-items:center}.dtu-root>.dtu-card:nth-child(3)>.dtu-table,.dtu-root>.dtu-card:nth-child(3)>.dtu-note{grid-column:2;grid-row:2}.dtu-root>.dtu-card:nth-child(4){grid-column:1;grid-row:4/span 2}.dtu-root>.dtu-card:nth-child(5){grid-column:2;grid-row:4}.dtu-root>.dtu-card:nth-child(7){grid-column:2;grid-row:5}.dtu-root>.dtu-card:nth-child(6){grid-column:1/-1;grid-row:6}}',
		'@media (min-width:1800px){.dtu-stat-value{font-size:22px;line-height:30px}}',
		'.dtu-icon{display:block}',
			'.dtu-head{display:flex;flex-direction:column;gap:4px}',
			'.dtu-title{font-size:14px;line-height:20px;font-weight:600}',
			'.dtu-note{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}',
			'.dtu-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px}',
			'.dtu-warn{color:var(--dsw-alias-state-warn-primary);font-size:13px;line-height:20px}',
			'.dtu-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}',
			'.dtu-stat{border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}',
			'.dtu-stat-label{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}',
			'.dtu-stat-value{font-size:19px;line-height:26px;font-variant-numeric:tabular-nums}',
			'.dtu-stat-detail{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}',
			'.dtu-card{border:.5px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl);background:var(--dsw-alias-settings-card-fill);padding:12px 14px;display:flex;flex-direction:column;gap:6px}',
			'.dtu-card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}',
			'.dtu-card-title{font-size:13px;line-height:20px;font-weight:600}',
			'.dtu-svg{display:block;width:100%;height:auto}',
		'.dtu-chart{position:relative}',
		/* 各时段用量(全部时间)卡：图表在卡片剩余空间内垂直居中（卡片被同行更高卡片拉伸时上下留白对称） */
		'.dtu-root>.dtu-card:nth-child(6)>.dtu-chart{flex:1 1 auto;align-items:center;display:flex;min-height:0}',
		'.dtu-tip{position:absolute;pointer-events:none;background:var(--dsw-alias-settings-card-fill);border:.5px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;font-size:11px;line-height:16px;box-shadow:0 4px 16px rgba(0,0,0,.28);white-space:nowrap;z-index:10;font-variant-numeric:tabular-nums}',
		'.dtu-tip-label{font-weight:600;margin-bottom:3px;color:var(--dsw-alias-label-primary)}',
		'.dtu-tip-row{display:flex;justify-content:space-between;gap:14px;color:var(--dsw-alias-label-tertiary)}',
		'.dtu-tip-row[data-strong="true"]{color:var(--dsw-alias-label-primary);font-weight:600}',
		'.dtu-guide{stroke:var(--dsw-alias-border-l2);stroke-width:1;stroke-dasharray:3 3}',
		'.dtu-dot-hover{fill:var(--dsw-alias-brand-primary);stroke:var(--dsw-alias-settings-card-fill);stroke-width:2}',
			'.dtu-grid{stroke:var(--dsw-alias-border-l2);stroke-width:1;stroke-dasharray:3 4}',
		'.dtu-grid-v{stroke:var(--dsw-alias-border-l1);stroke-width:1;stroke-dasharray:3 4}',
			'.dtu-tick{fill:var(--dsw-alias-label-tertiary);font-size:11px}',
			'.dtu-line{fill:none;stroke:var(--dsw-alias-brand-primary);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}',
			'.dtu-area{fill:var(--dsw-alias-brand-primary);opacity:.12}',
			'.dtu-dot{fill:var(--dsw-alias-settings-card-fill);stroke:var(--dsw-alias-brand-primary);stroke-width:2}',
			'.dtu-table{width:100%;border-collapse:collapse;font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}',
			'.dtu-caption{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;text-align:left;padding-bottom:4px}',
			'.dtu-table th{font-weight:400;color:var(--dsw-alias-label-tertiary);text-align:right;padding:3px 6px;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
			'.dtu-table td{text-align:right;padding:3px 6px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
			'.dtu-table th:first-child,.dtu-table td:first-child{text-align:left}',
			'.dtu-table tr:last-child td{border-bottom:0}',
			'.dtu-share{position:relative;height:4px;border-radius:2px;background:var(--dsw-alias-border-l1);overflow:hidden;margin:2px 0 3px;max-width:320px}',
			'.dtu-share-fill{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary);opacity:.75}',
			'.dtu-model-name{max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dtu-modeltable td{padding:6px 6px}',
			'.dtu-modeltable .dtu-share{margin:2px 0 5px}',
			'.dtu-table tfoot td{font-weight:600;border-top:.5px solid var(--dsw-alias-border-l2);border-bottom:0}',
			'.dtu-row-exp{cursor:pointer}',
			'.dtu-caret{display:inline-block;width:14px;color:var(--dsw-alias-label-tertiary);font-size:10px}',
			'.dtu-subrow td{color:var(--dsw-alias-label-tertiary);font-size:11px;padding-top:2px;padding-bottom:3px;border-bottom:.5px solid var(--dsw-alias-border-l1)}',
			'.dtu-subrow td:first-child{padding-left:22px;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dtu-bar{fill:var(--dsw-alias-brand-primary);opacity:.82;transition:opacity .12s ease}',
			'.dtu-bar[data-dim="true"]{opacity:.28}',
			'.dtu-bar-t1{fill:#5aa9e6}',
			'.dtu-bar-t2{fill:#6ec6c9}',
			'.dtu-bar-t3{fill:#7ed492}',
			'.dtu-bar-t4{fill:#e8a33d}',
			'.dtu-bar-t5{fill:#e5484d}',
			'.dtu-bar-label{fill:var(--dsw-alias-label-tertiary);font-size:10px;font-variant-numeric:tabular-nums}',
			'.dtu-avg{stroke:#e5484d;stroke-width:1;stroke-dasharray:4 4;opacity:.9}',
			'.dtu-avg-label{fill:#e5484d;font-size:10px;font-weight:600}',
			'.dtu-mh{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dtu-num{font-variant-numeric:tabular-nums}',
			'.dtu-strong{font-weight:600}',
			'.dtu-sum{color:var(--dsw-alias-label-tertiary)}',
			'.dtu-pct{display:block;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:400}',
			'.dtu-line-multi{fill:none;stroke-linejoin:round;stroke-linecap:round}',
			'.dtu-dot-multi{stroke-width:2}',
			'.dtu-chart-flat svg{max-height:320px}',
			'.dtu-card-center>.dtu-table,.dtu-card-center>.dtu-note{margin-top:auto;margin-bottom:auto}',
			'.dtu-legend{display:flex;gap:12px;flex-wrap:wrap;color:var(--dsw-alias-label-tertiary);font-size:11px}',
			'.dtu-legend-item{display:flex;align-items:center;gap:6px;max-width:190px}',
			'.dtu-legend-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dtu-legend-swatch{flex:0 0 auto;display:inline-block;width:18px;border-top:2px solid var(--dsw-alias-brand-primary)}',
			'.dtu-titles{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}'
		].join('');
		if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(CSS_ID) + ']') === null) {
			const tag = document.createElement('style');
			tag.dataset.plugin = '@local/dsh-token-stats';
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		const zh = {
			tab: 'Token 用量',
			heading: 'Token 用量',
			subtitle: '统计本机所有会话日志中记录的 token 消耗（本地时区 {zone}）。',
			'stat.today': '今日',
			'stat.week': '近 7 天',
			'stat.average': '日均（近 7 天）',
			'stat.calls': '调用次数（近 7 天）',
			'stat.maxday': '单日最多（全部时间）',
			'stat.mindingay': '单日最少（全部时间）',
			'detail.inOut': '输入 {input} · 输出 {output}',
			'detail.inOutCache': '输入 {input} · 缓存 {cache} · 输出 {output}',
			'col.cache': '缓存读取',
			'average.detail': '平均每次 {value} tokens',
			'card.day': '每日 token 用量（近 7 天）',
			'card.hour': '今日每小时的 token 用量',
			'card.model': '按模型（近 7 天）',
			'table.model.caption': '按模型明细',
			'col.model': '模型',
			'col.share': '占比',
			'empty.model': '还没有按模型记录的用量。',
			'stat.all': '全部时间',
			'card.alltime': '总览（全部时间）',
			'card.alltime.note': '自 {since} 起 · {sessions} 个会话 · 累计 {total} tokens',
			'table.alltime.caption': '全部时间按模型明细',
			'row.total': '合计',
			'empty.alltime': '还没有任何模型用量记录。',
			'card.day.note': '{from} 至 {to}',
			'card.hour.matrix': '各时段 × 模型（合计）',
			'card.day.matrix': '每日 × 模型（合计）',
			'card.slot': '各时段用量（全部时间）',
			'slot.note': '自 {since} 起 · 共 {days} 天',
			'col.average': '平均（日均）',
			'chart.slot.aria': '按小时的 token 折线图：总量与各模型（全部时间）',
			'table.slot.caption': '按小时明细（全部时间累计 / 日均）',
			'slot.matrix.caption': '时段 × 模型（全部时间累计）',
			'empty.slot': '还没有按小时统计到的用量。',
			'avg.label': '日均',
			'tip.day': '{date}（{dow}）：{total} tokens，输入 {input} / 输出 {output}，{calls} 次调用',
			'tip.hour': '{hour}：{total} tokens，输入 {input} / 输出 {output}，{calls} 次调用',
			'table.day.caption': '按天明细（点击行展开分模型用量）',
			'table.hour.caption': '按小时明细（点击行展开分模型用量；仅列出有记录的时段）',
			'col.date': '日期',
			'col.hour': '时段',
			'col.input': '输入',
			'col.output': '输出',
			'col.total': '合计',
			'col.calls': '次数',
			'empty.day': '近 7 天还没有记录。',
			'empty.hour': '今天还没有记录。',
			'state.loading': '正在读取会话日志…',
			'state.error': '无法读取 token 用量',
			'state.scanning': '正在扫描历史会话：已统计 {done} 个，剩余 {left} 个',
			'state.partial': '{count} 个会话日志读取失败，统计可能不完整',
			'state.problem': '最近一次读取出错：{message}',
			'state.stale': '刷新失败：{message}（显示上次结果）',
			'state.updated': '更新于 {time} · 时区 {zone}',
			'chart.day.aria': '近 7 天每日 token 用量折线图',
			'chart.hour.aria': '今日每小时 token 用量折线图',
			'dow.0': '周日',
			'dow.1': '周一',
			'dow.2': '周二',
			'dow.3': '周三',
			'dow.4': '周四',
			'dow.5': '周五',
			'dow.6': '周六'
		};

		const en = {
			tab: 'Token usage',
			heading: 'Token usage',
			subtitle: 'Tokens recorded in every session log on this machine (local time zone {zone}).',
			'stat.today': 'Today',
			'stat.week': 'Last 7 days',
			'stat.average': 'Daily average (7 days)',
			'stat.calls': 'Calls (7 days)',
			'stat.maxday': 'Max single day (all time)',
			'stat.mindingay': 'Min single day (all time)',
			'detail.inOut': 'input {input} · output {output}',
			'detail.inOutCache': 'input {input} · cache {cache} · output {output}',
			'col.cache': 'Cache read',
			'average.detail': '{value} tokens per call',
			'card.day': 'Tokens per day (last 7 days)',
			'card.hour': 'Tokens per hour (today)',
			'card.model': 'By model (last 7 days)',
			'table.model.caption': 'Per-model breakdown',
			'col.model': 'Model',
			'col.share': 'Share',
			'empty.model': 'No model-level usage recorded yet.',
			'stat.all': 'All time',
			'card.alltime': 'Overview (all time)',
			'card.hour.matrix': 'By hour and model (total)',
			'card.day.matrix': 'By day and model (total)',
			'card.slot': 'Usage by hour (all time)',
			'slot.note': 'since {since} · {days} days',
			'col.average': 'Average (per day)',
			'chart.slot.aria': 'Tokens per hour of day over all recorded time: overall total and per-model lines',
			'table.slot.caption': 'Per hour (all-time total / daily average)',
			'slot.matrix.caption': 'Hour × model (all-time total)',
			'empty.slot': 'No hourly usage recorded yet.',
			'avg.label': 'avg',
			'card.alltime.note': 'since {since} · {sessions} sessions · {total} tokens in total',
			'table.alltime.caption': 'Per-model breakdown (all time)',
			'row.total': 'Total',
			'empty.alltime': 'No model usage recorded yet.',
			'card.day.note': '{from} to {to}',
			'tip.day': '{date} ({dow}): {total} tokens, input {input} / output {output}, {calls} calls',
			'tip.hour': '{hour}: {total} tokens, input {input} / output {output}, {calls} calls',
			'table.day.caption': 'Per-day detail (click a row to expand per-model usage)',
			'table.hour.caption': 'Per-hour detail (click a row to expand per-model usage; hours with recorded usage only)',
			'col.date': 'Date',
			'col.hour': 'Hour',
			'col.input': 'Input',
			'col.output': 'Output',
			'col.total': 'Total',
			'col.calls': 'Calls',
			'empty.day': 'Nothing recorded in the last 7 days yet.',
			'empty.hour': 'Nothing recorded today yet.',
			'state.loading': 'Reading session logs…',
			'state.error': 'Could not read token usage',
			'state.scanning': 'Scanning session history: {done} folded, {left} queued',
			'state.partial': '{count} session log(s) could not be read; totals may be incomplete',
			'state.problem': 'Last read failed: {message}',
			'state.stale': 'Refresh failed: {message} (showing the previous reading)',
			'state.updated': 'Updated {time} · time zone {zone}',
			'chart.day.aria': 'Line chart of daily token usage over the last seven days',
			'chart.hour.aria': 'Line chart of token usage per hour today',
			'dow.0': 'Sun',
			'dow.1': 'Mon',
			'dow.2': 'Tue',
			'dow.3': 'Wed',
			'dow.4': 'Thu',
			'dow.5': 'Fri',
			'dow.6': 'Sat'
		};

		function pad2(value) {
			return value < 10 ? `0${value}` : String(value);
		}

		function round(value) {
			return Math.round(value * 10) / 10;
		}

		/** Compact token count: 940, 12.3k, 1.24M. */
		function formatTokens(value) {
			if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return '0';
			if (value < 1000) return String(Math.round(value));
			if (value < 1000000) {
				const scaled = value / 1000;
				return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1)}k`;
			}
			return `${(value / 1000000).toFixed(2)}M`;
		}

		function formatClock(time) {
			const date = new Date(time);
			return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
		}

		function bucketOf(value) {
			const source = value !== null && typeof value === 'object' ? value : {};
			return {
				input: Number(source.input) || 0,
				output: Number(source.output) || 0,
				cache: Number(source.cache) || 0,
				total: Number(source.total) || 0,
				calls: Number(source.calls) || 0
			};
		}

		/**
		 * Hand-rolled SVG line chart: one point per bucket, values on the y axis,
		 * per-point `<title>` tooltips, and a two-line x tick per point.
		 */
		function tipRow(key, label, value, strong) {
			return h('div', { key: key, className: 'dtu-tip-row', 'data-strong': strong ? 'true' : 'false' }, [
				h('span', { key: 'label' }, label),
				h('span', { key: 'value' }, value)
			]);
		}

		function LineChart(props) {
			const rows = props.rows;
			const ticks = props.ticks;
			const tooltips = props.tooltips;
			const t = props.t;
			const [hover, setHover] = React.useState(null);
			const count = rows.length;
			const padLeft = 56;
			const padRight = 12;
			const padTop = 14;
			const padBottom = 36;
			const innerWidth = CHART_WIDTH - padLeft - padRight;
			const innerHeight = CHART_HEIGHT - padTop - padBottom;
			let peak = 0;
			for (const row of rows) peak = Math.max(peak, row.total);
			const scale = peak > 0 ? peak : 1;
			const step = count > 1 ? innerWidth / (count - 1) : 0;
			const pointX = (index) => padLeft + (count > 1 ? step * index : innerWidth / 2);
			const pointY = (value) => padTop + innerHeight - (innerHeight * Math.max(0, Math.min(value, scale))) / scale;
			const curve = rows.map((row, index) => `${round(pointX(index))},${round(pointY(row.total))}`).join(' ');
			const area = `${padLeft},${round(padTop + innerHeight)} ${curve} ${round(padLeft + innerWidth)},${round(padTop + innerHeight)}`;
			const guides = peak > 0 ? [peak, peak / 2, 0] : [0];
			const children = [h('title', { key: 'label' }, props.label)];
			guides.forEach((value, index) => {
				children.push(h('g', { key: `guide-${index}` }, [
					h('line', {
						key: 'line',
						x1: padLeft,
						x2: padLeft + innerWidth,
						y1: round(pointY(value)),
						y2: round(pointY(value)),
						className: 'dtu-grid'
					}),
					h('text', {
						key: 'value',
						x: padLeft - 8,
						y: round(pointY(value)) + 4,
						textAnchor: 'end',
						className: 'dtu-tick'
					}, formatTokens(value))
				]));
			});
			children.push(h('polygon', { key: 'area', points: area, className: 'dtu-area' }));
			children.push(h('polyline', { key: 'curve', points: curve, className: 'dtu-line' }));
			rows.forEach((row, index) => {
				children.push(h('circle', {
					key: `dot-${index}`,
					cx: round(pointX(index)),
					cy: round(pointY(row.total)),
					r: 3.4,
					className: 'dtu-dot'
				}, h('title', null, tooltips[index])));
			});
			ticks.forEach((lines, index) => {
				children.push(h('g', { key: `tick-${index}` }, lines.map((text, line) => h('text', {
					key: `tick-${index}-${line}`,
					x: round(pointX(index)),
					y: CHART_HEIGHT - 22 + line * 13,
					textAnchor: 'middle',
					className: 'dtu-tick'
				}, text))));
			});
			const onMove = (event) => {
				if (count === 0) return;
				const rect = event.currentTarget.getBoundingClientRect();
				if (rect.width === 0) return;
				const x = (event.clientX - rect.left) * (CHART_WIDTH / rect.width);
				let best = 0;
				let bestDistance = Infinity;
				for (let index = 0; index < count; index += 1) {
					const distance = Math.abs(pointX(index) - x);
					if (distance < bestDistance) {
						bestDistance = distance;
						best = index;
					}
				}
				setHover(best);
			};

			// Hover overlay: dashed guide plus a highlighted dot above the curve.
			if (hover !== null && rows[hover] !== void 0) {
				const hx = pointX(hover);
				const hy = pointY(rows[hover].total);
				children.push(h('line', {
					key: 'hover-guide',
					x1: round(hx),
					x2: round(hx),
					y1: padTop,
					y2: round(padTop + innerHeight),
					className: 'dtu-guide'
				}));
				children.push(h('circle', { key: 'hover-dot', cx: round(hx), cy: round(hy), r: 5, className: 'dtu-dot-hover' }));
			}

			const svg = h('svg', {
				key: 'svg',
				className: 'dtu-svg',
				viewBox: `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`,
				role: 'img',
				'aria-label': props.label,
				onMouseMove: onMove,
				onMouseLeave: () => setHover(null)
			}, children);

			// HTML tooltip above (or below, near the top edge) the hovered point.
			let tip = null;
			if (hover !== null && rows[hover] !== void 0 && typeof t === 'function') {
				const row = rows[hover];
				const label = Array.isArray(ticks[hover]) && ticks[hover].length > 0 ? ticks[hover][0] : String(hover);
				const tipX = Math.min(88, Math.max(12, (pointX(hover) / CHART_WIDTH) * 100));
				const tipY = (pointY(row.total) / CHART_HEIGHT) * 100;
				tip = h('div', {
					key: 'tip',
					className: 'dtu-tip',
					style: {
						left: tipX + '%',
						top: tipY + '%',
						transform: tipY < 45 ? 'translate(-50%, 16px)' : 'translate(-50%, calc(-100% - 16px))'
					}
				}, [
					h('div', { key: 'label', className: 'dtu-tip-label' }, label),
					tipRow('input', t('col.input'), formatTokens(row.input)),
					row.cache > 0 ? tipRow('cache', t('col.cache'), formatTokens(row.cache)) : null,
					tipRow('output', t('col.output'), formatTokens(row.output)),
					tipRow('total', t('col.total'), formatTokens(row.total), true),
					tipRow('calls', t('col.calls'), String(row.calls))
				]);
			}

			return h('div', { className: 'dtu-chart' }, [svg, tip]);
		}

		/** Weekly bar chart: one rounded bar per day, value labels, average guide, hover tip. */
		function BarChart(props) {
			const rows = props.rows;
			const t = props.t;
			const [hover, setHover] = React.useState(null);
			const width = CHART_WIDTH;
			const height = 210;
			const padLeft = 52;
			const padRight = 16;
			const padTop = 46;
			const padBottom = 38;
			const innerW = width - padLeft - padRight;
			const innerH = height - padTop - padBottom;
			const count = rows.length;
			let peak = 0;
			let sum = 0;
			for (const row of rows) {
				peak = Math.max(peak, row.total);
				sum += row.total;
			}
			const scale = peak > 0 ? peak : 1;
			const slot = count > 0 ? innerW / count : innerW;
			const barW = Math.min(48, slot * 0.5);
			const barX = (index) => padLeft + slot * index + (slot - barW) / 2;
			const barH = (value) => (peak > 0 ? Math.max(0, (value / scale) * innerH) : 0);
			const average = count > 0 ? sum / count : 0;
			// Tiered fill by daily volume: cool = light days, hot = heavy days.
			const barTierClass = (value) => {
				if (value <= 5e6) return 'dtu-bar dtu-bar-t1';
				if (value <= 10e6) return 'dtu-bar dtu-bar-t2';
				if (value <= 50e6) return 'dtu-bar dtu-bar-t3';
				if (value <= 100e6) return 'dtu-bar dtu-bar-t4';
				if (value <= 200e6) return 'dtu-bar';
				return 'dtu-bar dtu-bar-t5';
			};
			const children = [h('title', { key: 'label' }, props.label)];
			if (peak > 0) {
				for (const [index, value] of [peak, peak / 2].entries()) {
					const y = padTop + innerH - barH(value);
					children.push(h('line', {
						key: `guide-${index}`,
						x1: padLeft,
						x2: padLeft + innerW,
						y1: Math.round(y),
						y2: Math.round(y),
						className: 'dtu-grid'
					}));
				}
			}
			rows.forEach((row, index) => {
				const x = barX(index);
				const heightValue = barH(row.total);
				const y = padTop + innerH - heightValue;
				children.push(h('rect', {
					key: `bar-${index}`,
					x: Math.round(x * 10) / 10,
					y: Math.round(y * 10) / 10,
					width: Math.round(barW * 10) / 10,
					height: Math.round(Math.max(heightValue, row.total > 0 ? 2 : 0) * 10) / 10,
					rx: 3,
					className: barTierClass(row.total),
					'data-dim': hover !== null && hover !== index ? 'true' : 'false'
				}));
				const lines = Array.isArray(props.labels[index]) ? props.labels[index] : [];
				lines.forEach((text, lineIndex) => {
					children.push(h('text', {
						key: `label-${index}-${lineIndex}`,
						x: Math.round(x + barW / 2),
						y: height - 22 + lineIndex * 13,
						textAnchor: 'middle',
						className: 'dtu-tick'
					}, text));
				});
				if (row.total > 0) {
					children.push(h('text', {
						key: `value-${index}`,
						x: Math.round(x + barW / 2),
						y: Math.round(y - 6),
						textAnchor: 'middle',
						className: 'dtu-bar-label'
					}, formatTokens(row.total)));
				}
			});
			if (average > 0) {
				const y = padTop + innerH - barH(average);
				children.push(h('line', { key: 'avg', x1: padLeft, x2: padLeft + innerW, y1: Math.round(y), y2: Math.round(y), className: 'dtu-avg' }));
				// Label lives in the reserved top row (above padTop): no bar can
				// ever reach it, so it never overlaps regardless of day totals.
				children.push(h('text', {
					key: 'avg-label',
					x: padLeft,
					y: 14,
					textAnchor: 'start',
					className: 'dtu-avg-label'
				}, `${t('avg.label')} ${formatTokens(average)}`));
			}
			const svg = h('svg', {
				key: 'svg',
				className: 'dtu-svg',
				viewBox: `0 0 ${width} ${height}`,
				role: 'img',
				'aria-label': props.label,
				onMouseMove: (event) => {
					if (count === 0) return;
					const rect = event.currentTarget.getBoundingClientRect();
					if (rect.width === 0) return;
					const x = (event.clientX - rect.left) * (width / rect.width);
					let best = 0;
					let bestDistance = Infinity;
					for (let index = 0; index < count; index += 1) {
						const distance = Math.abs(barX(index) + barW / 2 - x);
						if (distance < bestDistance) {
							bestDistance = distance;
							best = index;
						}
					}
					setHover(best);
				},
				onMouseLeave: () => setHover(null)
			}, children);
			let tip = null;
			if (hover !== null && rows[hover] !== void 0 && typeof t === 'function') {
				const row = rows[hover];
				const lines = Array.isArray(props.labels[hover]) ? props.labels[hover] : [];
				const tipX = Math.min(88, Math.max(12, ((barX(hover) + barW / 2) / width) * 100));
				const tipY = ((padTop + innerH - barH(row.total)) / height) * 100;
				tip = h('div', {
					key: 'tip',
					className: 'dtu-tip',
					style: {
						left: tipX + '%',
						top: tipY + '%',
						transform: tipY < 45 ? 'translate(-50%, 16px)' : 'translate(-50%, calc(-100% - 16px))'
					}
				}, [
					h('div', { key: 'label', className: 'dtu-tip-label' }, lines.join(' ')),
					tipRow('input', t('col.input'), formatTokens(row.input)),
					row.cache > 0 ? tipRow('cache', t('col.cache'), formatTokens(row.cache)) : null,
					tipRow('output', t('col.output'), formatTokens(row.output)),
					tipRow('total', t('col.total'), formatTokens(row.total), true),
					tipRow('calls', t('col.calls'), String(row.calls))
				]);
			}
			return h('div', { className: 'dtu-chart' }, [svg, tip]);
		}

		/** Multi-series line chart over the 24 slots of a day: one colored line per series. */
		function SlotLineChart(props) {
			const series = props.series;
			const count = props.count;
			const padLeft = 56;
			const padRight = 12;
			const padTop = 14;
			const padBottom = 30;
			// This card spans the full row: pass a wide, flat viewbox so the
			// aspect-ratio scaling renders a low strip, not a giant chart.
			const chartWidth = typeof props.width === 'number' ? props.width : CHART_WIDTH;
			const chartHeight = typeof props.height === 'number' ? props.height : CHART_HEIGHT;
			const innerWidth = chartWidth - padLeft - padRight;
			const innerHeight = chartHeight - padTop - padBottom;
			let peak = 0;
			for (const entry of series) {
				for (const value of entry.values) peak = Math.max(peak, value);
			}
			const scale = peak > 0 ? peak : 1;
			const stepX = count > 1 ? innerWidth / (count - 1) : innerWidth;
			const pointX = (index) => padLeft + (count > 1 ? stepX * index : innerWidth / 2);
			const pointY = (value) => padTop + innerHeight - (innerHeight * Math.max(0, Math.min(value, scale))) / scale;
			const curveOf = (values) => values.map((value, index) => `${round(pointX(index))},${round(pointY(value))}`).join(' ');
			const guides = peak > 0 ? [peak, peak / 2, 0] : [0];
			const labelStep = count <= 24 ? 1 : Math.ceil(count / 24);

			// Hover overlay (guide line, per-series dots, tooltip) is moved
			// imperatively with rAF throttling, so sweeping the chart never
			// re-renders the SVG; React state only flips on enter/leave.
			const [hoverOn, setHoverOn] = React.useState(false);
			const guideRef = React.useRef(null);
			const dotRefs = React.useRef([]);
			const tipRef = React.useRef(null);
			const tipLabelRef = React.useRef(null);
			const tipValueRefs = React.useRef([]);
			const rectRef = React.useRef(null);
			const lastRef = React.useRef(-1);
			const rafRef = React.useRef(0);

			const paintHover = (index) => {
				const hx = round(pointX(index));
				const guide = guideRef.current;
				if (guide) {
					guide.setAttribute('x1', hx);
					guide.setAttribute('x2', hx);
				}
				for (let i = 0; i < series.length; i += 1) {
					const dot = dotRefs.current[i];
					if (dot) {
						dot.setAttribute('cx', hx);
						dot.setAttribute('cy', round(pointY(series[i].values[index] || 0)));
					}
				}
				const tip = tipRef.current;
				if (tip) tip.style.left = Math.min(88, Math.max(12, (hx / chartWidth) * 100)) + '%';
				if (tipLabelRef.current) tipLabelRef.current.textContent = `${pad2(index)}:00`;
				for (let i = 0; i < series.length; i += 1) {
					const valueEl = tipValueRefs.current[i];
					if (valueEl) valueEl.textContent = formatTokens(series[i].values[index] || 0);
				}
			};
			const updateHover = (index) => {
				if (index < 0 || index >= count || index === lastRef.current) return;
				lastRef.current = index;
				paintHover(index);
			};
			// Data refresh re-renders this component; re-sync the imperative
			// overlay to the slot under the pointer.
			React.useEffect(() => {
				if (lastRef.current >= 0 && lastRef.current < count) paintHover(lastRef.current);
			});
			React.useEffect(() => () => {
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
			}, []);

			const onMouseEnter = (event) => {
				if (count === 0) return;
				rectRef.current = event.currentTarget.getBoundingClientRect();
				lastRef.current = -1;
				paintHover(0);
				lastRef.current = 0;
				setHoverOn(true);
			};
			const onMouseMove = (event) => {
				if (count === 0) return;
				const rect = rectRef.current;
				if (!rect || rect.width === 0) return;
				const x = (event.clientX - rect.left) * (chartWidth / rect.width);
				const index = count > 1 ? Math.max(0, Math.min(count - 1, Math.round((x - padLeft) / stepX))) : 0;
				if (rafRef.current) cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(() => {
					rafRef.current = 0;
					updateHover(index);
				});
			};
			const onMouseLeave = () => {
				if (rafRef.current) {
					cancelAnimationFrame(rafRef.current);
					rafRef.current = 0;
				}
				lastRef.current = -1;
				setHoverOn(false);
			};

			const children = [h('title', { key: 'label' }, props.label)];
			// Vertical dashed grid line at every hour, behind everything else.
			for (let index = 0; index < count; index += 1) {
				children.push(h('line', {
					key: `gridv-${index}`,
					x1: round(pointX(index)),
					x2: round(pointX(index)),
					y1: padTop,
					y2: round(padTop + innerHeight),
					className: 'dtu-grid-v'
				}));
			}
			guides.forEach((value, index) => {
				children.push(h('g', { key: `guide-${index}` }, [
					h('line', { key: 'line', x1: padLeft, x2: padLeft + innerWidth, y1: round(pointY(value)), y2: round(pointY(value)), className: 'dtu-grid' }),
					h('text', { key: 'value', x: padLeft - 8, y: round(pointY(value)) + 4, textAnchor: 'end', className: 'dtu-tick' }, formatTokens(value))
				]));
			});
			// Model lines first, so the overall total line renders on top.
			for (let i = series.length - 1; i >= 0; i -= 1) {
				const entry = series[i];
				children.push(h('polyline', {
					key: `line-${entry.key}`,
					points: curveOf(entry.values),
					className: 'dtu-line-multi',
					style: { stroke: entry.color, strokeWidth: entry.width }
				}));
			}
			for (let index = 0; index < count; index += labelStep) {
				children.push(h('text', {
					key: `tick-${index}`,
					x: round(pointX(index)),
					y: chartHeight - 10,
					textAnchor: 'middle',
					className: 'dtu-tick'
				}, `${pad2(index)}:00`));
			}
			const overlayVisible = hoverOn && count > 0;
			children.push(h('g', {
				key: 'overlay',
				style: { display: overlayVisible ? undefined : 'none' }
			}, [
				h('line', {
					key: 'guide',
					ref: guideRef,
					x1: round(pointX(0)),
					x2: round(pointX(0)),
					y1: padTop,
					y2: round(padTop + innerHeight),
					className: 'dtu-guide'
				}),
				...series.map((entry, i) => h('circle', {
					key: `dot-${entry.key}`,
					ref: (el) => { dotRefs.current[i] = el; },
					cx: round(pointX(0)),
					cy: round(pointY(entry.values[0] || 0)),
					r: 3.2,
					className: 'dtu-dot-multi',
					style: { stroke: entry.color, fill: 'var(--dsw-alias-settings-card-fill)' }
				}))
			]));
			const svg = h('svg', {
				key: 'svg',
				className: 'dtu-svg',
				viewBox: `0 0 ${chartWidth} ${chartHeight}`,
				role: 'img',
				'aria-label': props.label,
				onMouseEnter: onMouseEnter,
				onMouseMove: onMouseMove,
				onMouseLeave: onMouseLeave
			}, children);
			const tip = h('div', {
				key: 'tip',
				ref: tipRef,
				className: 'dtu-tip',
				style: {
					left: '12%',
					top: '8%',
					transform: 'translate(-50%, 0)',
					display: overlayVisible ? undefined : 'none'
				}
			}, [
				h('div', { key: 'label', className: 'dtu-tip-label', ref: tipLabelRef }, '00:00'),
				...series.map((entry, i) => h('div', {
					key: `row-${entry.key}`,
					className: 'dtu-tip-row',
					'data-strong': entry.key === 'total' ? 'true' : 'false'
				}, [
					h('span', { key: 'label' }, entry.label),
					h('span', { key: 'value', ref: (el) => { tipValueRefs.current[i] = el; } }, formatTokens(entry.values[0] || 0))
				]))
			]);
			return h('div', { className: props.wrapperClass || 'dtu-chart' }, [svg, tip]);
		}

		function StatCard(props) {
			return h('div', { className: 'dtu-stat' }, [
				h('div', { key: 'label', className: 'dtu-stat-label' }, props.label),
				h('div', { key: 'value', className: 'dtu-stat-value' }, props.value),
				props.detail === void 0 ? null : h('div', { key: 'detail', className: 'dtu-stat-detail' }, props.detail)
			]);
		}

		function DetailTable(props) {
			const expandable = typeof props.subrowsOf === 'function' && typeof props.onToggle === 'function';
			return h('table', { className: 'dtu-table' }, [
				h('caption', { key: 'caption', className: 'dtu-caption' }, props.caption),
				h('thead', { key: 'head' }, h('tr', null, props.columns.map((column) => h('th', {
					key: column,
					scope: 'col'
				}, column)))),
				h('tbody', { key: 'body' }, props.rows.flatMap((row, index) => {
					const cells = row.map((cell, cellIndex) => h('td', {
						key: `${index}-${cellIndex}`
					}, cell));
					const expandable = typeof props.subrowsOf === 'function' && typeof props.onToggle === 'function';
					if (!expandable) return [h('tr', { key: `r-${index}` }, cells)];
					const open = props.openOf(index) === true;
					cells[0] = h('td', { key: `${index}-0` }, [
						h('span', { key: 'caret', className: 'dtu-caret' }, open ? '▾' : '▸'),
						row[0]
					]);
					const subs = open ? (props.subrowsOf(index) ?? []) : [];
					return [h('tr', {
						key: `r-${index}`,
						className: 'dtu-row-exp',
						onClick: () => props.onToggle(index)
					}, cells)].concat(subs.map((sub, subIndex) => h('tr', {
						key: `${index}-s${subIndex}`,
						className: 'dtu-subrow'
					}, sub.map((cell, cellIndex) => h('td', {
						key: `${index}-s${subIndex}-${cellIndex}`
					}, cell)))));
				}))
			]);
		}

		/** Per-model breakdown table with a share bar in the first cell. */
		function ModelTable(props) {
			const t = props.t;
			const rows = props.rows;
			const total = props.total;
			return h('table', { className: 'dtu-table dtu-modeltable' }, [
				h('caption', { key: 'caption', className: 'dtu-caption' }, props.caption),
				h('thead', { key: 'head' }, h('tr', null, [t('col.model'), t('col.input'), t('col.cache'), t('col.output'), t('col.total'), t('col.calls'), t('col.share')].map((column) => h('th', {
					key: column,
					scope: 'col'
				}, column)))),
				h('tbody', { key: 'body' }, rows.map((row, index) => {
					const share = total > 0 ? (row.total / total) * 100 : 0;
					return h('tr', { key: `${index}` }, [
						h('td', { key: `${index}-0` }, [
							h('div', { key: 'bar', className: 'dtu-share' }, h('i', { key: 'fill', className: 'dtu-share-fill', style: { width: share.toFixed(1) + '%' } })),
							h('div', { key: 'name', className: 'dtu-model-name', title: row.model }, row.model)
						]),
						h('td', { key: `${index}-1` }, formatTokens(row.input)),
						h('td', { key: `${index}-1c` }, formatTokens(row.cache)),
						h('td', { key: `${index}-2` }, formatTokens(row.output)),
						h('td', { key: `${index}-3` }, formatTokens(row.total)),
						h('td', { key: `${index}-4` }, String(row.calls)),
								h('td', { key: `${index}-5` }, share.toFixed(1) + '%')
					]);
				})),
				props.footer === void 0 ? null : h('tfoot', { key: 'foot' }, h('tr', null, props.footer.map((cell, cellIndex) => h('td', {
					key: `${cellIndex}`
				}, cell))))
			]);
		}

		/**
		 * Slot × model matrix: one row per slot (hour or day), one column per model.
		 * `renderLabel(slot, index)` renders the first column, `firstColHeader` its header.
		 */
		function ModelMatrix(props) {
			const t = props.t;
			const slots = props.slots;
			const models = props.models;
			const grand = slots.reduce((acc, slot) => acc + slot.total, 0);
			const renderLabel = typeof props.renderLabel === 'function' ? props.renderLabel : (slot) => `${pad2(slot.hour)}:00`;
			const keyOf = typeof props.keyOf === 'function' ? props.keyOf : (slot) => String(slot.hour);
			const firstColHeader = props.firstColHeader !== void 0 ? props.firstColHeader : t('col.hour');
			if (slots.length === 0) return h('div', { className: 'dtu-note' }, props.emptyText);
			return h('table', { className: 'dtu-table dtu-matrix' }, [
				h('caption', { key: 'caption', className: 'dtu-caption' }, props.caption),
				h('thead', { key: 'head' }, h('tr', null, [
					h('th', { key: 'label', scope: 'col' }, firstColHeader),
					...models.map((model) => h('th', { key: `m-${model}`, scope: 'col', className: 'dtu-mh', title: model }, model)),
					h('th', { key: 'total', scope: 'col' }, t('col.total'))
				])),
				h('tbody', { key: 'body' }, slots.map((slot, index) => {
					const byModel = new Map(slot.models.map((entry) => [entry.model, entry]));
					return h('tr', { key: `r-${keyOf(slot, index)}` }, [
						h('td', { key: 'label' }, renderLabel(slot, index)),
						...models.map((model) => {
							const entry = byModel.get(model);
							return h('td', { key: `c-${model}`, className: 'dtu-num' }, entry === void 0 ? '—' : formatTokens(entry.total));
						}),
						h('td', { key: 'total', className: 'dtu-num dtu-strong' }, [
							formatTokens(slot.total),
							grand > 0 ? h('span', { key: 'pct', className: 'dtu-pct' }, `${((slot.total / grand) * 100).toFixed(1)}%`) : null
						])
					]);
				})),
				h('tfoot', { key: 'foot' }, (() => {
					const grand = slots.reduce((acc, slot) => acc + slot.total, 0);
					return h('tr', null, [
						h('td', { key: 'label' }, t('row.total')),
						...models.map((model) => {
							let total = 0;
							for (const slot of slots) {
								for (const entry of slot.models) {
									if (entry.model === model) total += entry.total;
								}
							}
							return h('td', { key: `s-${model}`, className: 'dtu-num dtu-sum' }, [
								formatTokens(total),
								grand > 0 ? h('span', { key: 'pct', className: 'dtu-pct' }, `${((total / grand) * 100).toFixed(1)}%`) : null
							]);
						}),
						h('td', { key: 'grand', className: 'dtu-num dtu-strong' }, [
							formatTokens(grand),
							grand > 0 ? h('span', { key: 'pct', className: 'dtu-pct' }, '100%') : null
						])
					]);
				})())
			]);
		}

		/** Sidebar entry icon: axes plus a rising usage line. */
		function TokenIcon(props) {
			const size = typeof props.size === 'number' && props.size > 0 ? props.size : 20;
			return h('svg', {
				className: 'dtu-icon',
				width: size,
				height: size,
				viewBox: '0 0 24 24',
				fill: 'none',
				stroke: 'currentColor',
				strokeWidth: 1.8,
				strokeLinecap: 'round',
				strokeLinejoin: 'round',
				'aria-hidden': 'true',
				'data-active': props.active === true ? 'true' : 'false'
			}, [
				h('path', { key: 'frame', d: 'M4 4v16h16' }),
				h('path', { key: 'line', d: 'M7.5 14.5l3.5-4.5 2.8 2.8 4.7-6' })
			]);
		}

		function TokenUsageTab(props) {
			const request = props.request;
			const t = props.t;
			const readLocaleRevision = props.readLocaleRevision;
			const onLocaleChange = props.onLocaleChange;
			const [localeRevision, setLocaleRevision] = React.useState(() => readLocaleRevision());
			const [state, setState] = React.useState({ status: 'loading', data: null, error: null });
			const requestRef = React.useRef(request);
			requestRef.current = request;

			React.useEffect(() => onLocaleChange(() => setLocaleRevision(readLocaleRevision())), []);

			React.useEffect(() => {
				let cancelled = false;
				let busy = false;
				const controller = new AbortController();
				const load = async () => {
					if (busy) return;
					busy = true;
					try {
						const result = await requestRef.current(controller.signal);
						if (cancelled) return;
						// directCall already unwraps the {ok, value} envelope, so a
						// successful call hands back the summary value itself.
						if (result === null || result === void 0) {
							throw new Error('empty response');
						}
						setState({ status: 'ready', data: result, error: null });
					} catch (error) {
						if (cancelled || controller.signal.aborted) return;
						const message = error instanceof Error ? error.message : String(error);
						setState((previous) => ({
							status: previous.data === null ? 'error' : 'ready',
							data: previous.data,
							error: message
						}));
					} finally {
						busy = false;
					}
				};
				load();
				const timer = window.setInterval(load, REFRESH_MS);
				return () => {
					cancelled = true;
					controller.abort();
					window.clearInterval(timer);
				};
			}, []);

			if (state.status === 'loading') {
				return h('section', { className: 'dtu-root' }, h('div', { className: 'dtu-note' }, t('state.loading')));
			}
			if (state.data === null) {
				return h('section', { className: 'dtu-root' }, [
					h('div', { key: 'title', className: 'dtu-title' }, t('heading')),
					h('div', { key: 'error', className: 'dtu-error' }, `${t('state.error')}: ${state.error ?? ''}`)
				]);
			}

			const data = state.data;
			const zone = typeof data.timeZone === 'string' && data.timeZone.length > 0 ? data.timeZone : 'local';
			const dayRows = Array.isArray(data.days) ? data.days.map(bucketOf) : [];
			const hourRows = Array.isArray(data.hours) ? data.hours.map(bucketOf) : [];
			const dayKeys = Array.isArray(data.days) ? data.days.map((row) => String(row.key)) : [];
			// Single-day extremes over the whole recorded history; the minimum skips zero days.
			const allTimeDays = Array.isArray(data.allTimeDays) ? data.allTimeDays : [];
			const allTimeDayRows = allTimeDays.map(bucketOf);
			const dayExtremes = (() => {
				let max = -1;
				let min = -1;
				for (let index = 0; index < allTimeDayRows.length; index += 1) {
					const total = allTimeDayRows[index].total;
					if (total > 0) {
						if (max === -1 || total > allTimeDayRows[max].total) max = index;
						if (min === -1 || total < allTimeDayRows[min].total) min = index;
					}
				}
				return { max, min };
			})();
			const dayLabel = (index) => `${allTimeDays[index].key.slice(5).replace('-', '/')} ${t(WEEKDAYS[Number(allTimeDays[index].dow) || 0])}`;
			const dayDetail = (index) => {
				const counts = allTimeDayRows[index];
				const breakdown = counts.cache > 0
					? t('detail.inOutCache', { input: formatTokens(counts.input), cache: formatTokens(counts.cache), output: formatTokens(counts.output) })
					: t('detail.inOut', { input: formatTokens(counts.input), output: formatTokens(counts.output) });
				return `${dayLabel(index)} · ${breakdown}`;
			};
			const today = bucketOf(data.today);
			const week = bucketOf(data.week);
			const allTime = bucketOf(data.allTime);
			const allTimeModels = Array.isArray(data.allTimeByModel) ? data.allTimeByModel : [];
			const allSince = Number(data.allSince);
			const fmtDate = (time) => {
				const date = new Date(time);
				return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
			};
			const hourSlots = (Array.isArray(data.hours) ? data.hours : []).map((bucket, hour) => {
				const counts = bucketOf(bucket);
				return {
					hour,
					input: counts.input,
					output: counts.output,
					cache: counts.cache,
					total: counts.total,
					calls: counts.calls,
					models: bucket !== null && typeof bucket === 'object' && Array.isArray(bucket.models) ? bucket.models : []
				};
			});
			const hourModelColumns = (() => {
				const totals = new Map();
				for (const slot of hourSlots) {
					for (const entry of slot.models) totals.set(entry.model, (totals.get(entry.model) ?? 0) + entry.total);
				}
				return [...totals.entries()].sort((left, right) => right[1] - left[1]).map(([model]) => model);
			})();
			const dayMatrixSlots = (Array.isArray(data.days) ? data.days : []).map((row) => ({
				total: Number(row.total) || 0,
				models: Array.isArray(row.models) ? row.models : []
			}));
			const dayModelColumns = (() => {
				const totals = new Map();
				for (const slot of dayMatrixSlots) {
					for (const entry of slot.models) totals.set(entry.model, (totals.get(entry.model) ?? 0) + entry.total);
				}
				return [...totals.entries()].sort((left, right) => right[1] - left[1]).map(([model]) => model);
			})();
			// All-time by-slot series: totals plus the per-day average over the covered days
			// (first recorded event through today).
			const daysCovered = (() => {
				if (!(allSince > 0)) return 1;
				const start = new Date(allSince);
				start.setHours(0, 0, 0, 0);
				const now = new Date();
				now.setHours(0, 0, 0, 0);
				return Math.max(1, Math.round((now.getTime() - start.getTime()) / 86_400_000) + 1);
			})();
			const allSlots = Array.isArray(data.hourOfDayAll) ? data.hourOfDayAll : [];
			// Multi-series for the by-slot chart (all time): overall total plus one line
			// per model; brand color for the total, a fixed palette for the models.
			const MODEL_COLORS = ['#e8a33d', '#5aa9e6', '#7ed492', '#d4789c', '#b48ce0', '#e6c35a', '#6ec6c9'];
			const slotSeries = [{
				key: 'total',
				label: t('col.total'),
				color: 'var(--dsw-alias-brand-primary)',
				width: 2.5,
				values: allSlots.map((slot) => Number(slot.total) || 0)
			}].concat(allTimeModels.map((entry, index) => ({
				key: `m-${entry.model}`,
				label: entry.model,
				color: MODEL_COLORS[index % MODEL_COLORS.length],
				width: 1.6,
				values: allSlots.map((slot) => {
					const match = Array.isArray(slot.models) ? slot.models.find((m) => m.model === entry.model) : void 0;
					return match ? Number(match.total) || 0 : 0;
				})
			})));

			const dayTicks = dayRows.map((bucket, index) => [
				t(WEEKDAYS[Array.isArray(data.days) ? Number(data.days[index].dow) || 0 : 0]),
				dayKeys[index].slice(5).replace('-', '/')
			]);
			const hourTicks = hourSlots.map((slot) => (slot.hour % 3 === 0 ? [`${pad2(slot.hour)}:00`] : []));
			const hourTips = hourSlots.map((slot) => t('tip.hour', {
				hour: `${pad2(slot.hour)}:00`,
				total: formatTokens(slot.total),
				input: formatTokens(slot.input),
				output: formatTokens(slot.output),
				calls: slot.calls
			}));

			const activeHours = hourSlots.filter((slot) => slot.calls > 0);
			const average = week.calls > 0 ? week.total / week.calls : 0;
			const footnotes = [];
			if (data.scanning === true) {
				footnotes.push(t('state.scanning', { done: Number(data.sessions) || 0, left: Number(data.queued) || 0 }));
			}
			if (Number(data.unreadable) > 0) footnotes.push(t('state.partial', { count: Number(data.unreadable) }));
			if (typeof data.problem === 'string' && data.problem.length > 0) {
				footnotes.push(t('state.problem', { message: data.problem }));
			}
			if (state.error !== null) footnotes.push(t('state.stale', { message: state.error }));

			return h('section', { className: 'dtu-root', 'data-locale-revision': localeRevision }, [
				h('header', { key: 'head', className: 'dtu-head' }, [
					h('div', { key: 'title', className: 'dtu-title' }, t('heading')),
					h('div', { key: 'subtitle', className: 'dtu-note' }, t('subtitle', { zone }))
				]),
				h('div', { key: 'stats', className: 'dtu-stats' }, [
					h(StatCard, {
						key: 'today',
						label: t('stat.today'),
						value: formatTokens(today.total),
						detail: today.cache > 0
							? t('detail.inOutCache', { input: formatTokens(today.input), cache: formatTokens(today.cache), output: formatTokens(today.output) })
							: t('detail.inOut', { input: formatTokens(today.input), output: formatTokens(today.output) })
					}),
					h(StatCard, {
						key: 'week',
						label: t('stat.week'),
						value: formatTokens(week.total),
						detail: week.cache > 0
							? t('detail.inOutCache', { input: formatTokens(week.input), cache: formatTokens(week.cache), output: formatTokens(week.output) })
							: t('detail.inOut', { input: formatTokens(week.input), output: formatTokens(week.output) })
					}),
					h(StatCard, {
						key: 'average',
						label: t('stat.average'),
						value: formatTokens(week.total / 7),
						detail: t('detail.inOut', { input: formatTokens(week.input / 7), output: formatTokens(week.output / 7) })
					}),
					h(StatCard, {
						key: 'maxday',
						label: t('stat.maxday'),
						value: dayExtremes.max >= 0 ? formatTokens(allTimeDayRows[dayExtremes.max].total) : '—',
						detail: dayExtremes.max >= 0 ? dayDetail(dayExtremes.max) : void 0
					}),
					h(StatCard, {
						key: 'mindingay',
						label: t('stat.mindingay'),
						value: dayExtremes.min >= 0 ? formatTokens(allTimeDayRows[dayExtremes.min].total) : '—',
						detail: dayExtremes.min >= 0 ? dayDetail(dayExtremes.min) : void 0
					}),
					h(StatCard, {
						key: 'calls',
						label: t('stat.calls'),
						value: String(week.calls),
						detail: t('average.detail', { value: formatTokens(average) })
					}),
					h(StatCard, {
						key: 'all',
						label: t('stat.all'),
						value: formatTokens(allTime.total),
						detail: allTime.cache > 0
							? t('detail.inOutCache', { input: formatTokens(allTime.input), cache: formatTokens(allTime.cache), output: formatTokens(allTime.output) })
							: t('detail.inOut', { input: formatTokens(allTime.input), output: formatTokens(allTime.output) })
					})
				]),
				h('div', { key: 'hour', className: 'dtu-card' }, [
					h('div', { key: 'head', className: 'dtu-card-head' }, [
						h('div', { key: 'title', className: 'dtu-card-title' }, t('card.hour'))
					]),
					h(LineChart, {
						key: 'chart',
						rows: hourSlots,
						ticks: hourTicks,
						tooltips: hourTips,
						t: t,
						label: t('chart.hour.aria')
					}),
					activeHours.length === 0
						? h('div', { key: 'empty', className: 'dtu-note' }, t('empty.hour'))
						: h(ModelMatrix, {
							key: 'matrix',
							caption: t('card.hour.matrix'),
							slots: activeHours,
							models: hourModelColumns,
							emptyText: t('empty.hour'),
							t: t
						})
				]),
				h('div', { key: 'day', className: 'dtu-card' }, [
					h('div', { key: 'head', className: 'dtu-card-head' }, [
						h('div', { key: 'title', className: 'dtu-card-title' }, t('card.day')),
						h('div', { key: 'note', className: 'dtu-note' }, dayKeys.length > 0 ? t('card.day.note', {
							from: dayKeys[0],
							to: dayKeys[dayKeys.length - 1]
						}) : ''),
						h('div', { key: 'legend', className: 'dtu-legend' }, [
							['≤5M', '#5aa9e6'],
							['5–10M', '#6ec6c9'],
							['10–50M', '#7ed492'],
							['50–100M', '#e8a33d'],
							['>100M', 'var(--dsw-alias-brand-primary)'],
							['>200M', '#e5484d']
						].map(([text, color]) => h('span', { key: text, className: 'dtu-legend-item' }, [
							h('i', { key: 'swatch', className: 'dtu-legend-swatch', style: { borderTopColor: color } }),
							text
						])))
					]),
					h(BarChart, {
						key: 'chart',
						rows: dayRows,
						labels: dayTicks,
						t: t,
						label: t('chart.day.aria')
					}),
					dayRows.every((bucket) => bucket.calls === 0)
						? h('div', { key: 'empty', className: 'dtu-note' }, t('empty.day'))
						: h(ModelMatrix, {
							key: 'matrix',
							caption: t('card.day.matrix'),
							slots: dayMatrixSlots,
							models: dayModelColumns,
							firstColHeader: t('col.date'),
							renderLabel: (row, index) => `${dayKeys[index]} ${t(WEEKDAYS[Array.isArray(data.days) ? Number(data.days[index].dow) || 0 : 0])}`,
							keyOf: (row, index) => dayKeys[index],
							emptyText: t('empty.day'),
							t: t
						})
				]),
				h('div', { key: 'model', className: 'dtu-card dtu-card-center' }, [
					h('div', { key: 'head', className: 'dtu-card-head' }, [
						h('div', { key: 'title', className: 'dtu-card-title' }, t('card.model'))
					]),
					!Array.isArray(data.byModel) || data.byModel.length === 0
						? h('div', { key: 'empty', className: 'dtu-note' }, t('empty.model'))
						: h(ModelTable, {
							key: 'table',
							caption: t('table.model.caption'),
							rows: data.byModel,
							total: week.total,
							t: t
						})
				]),
				h('div', { key: 'slot', className: 'dtu-card' }, [
					h('div', { key: 'head', className: 'dtu-card-head' }, [
						h('div', { key: 'titles', className: 'dtu-titles' }, [
							h('div', { key: 'title', className: 'dtu-card-title' }, t('card.slot')),
							allSince > 0 ? h('div', { key: 'note', className: 'dtu-note' }, t('slot.note', {
								since: fmtDate(allSince),
								days: daysCovered
							})) : null
						]),
						h('div', { key: 'legend', className: 'dtu-legend' }, slotSeries.map((entry) => h('span', {
							key: entry.key,
							className: 'dtu-legend-item',
							title: entry.label
						}, [
							h('i', { key: 'swatch', className: 'dtu-legend-swatch', style: { borderTopColor: entry.color } }),
							h('span', { key: 'label', className: 'dtu-legend-label' }, entry.label)
						])))
					]),
					slotSeries[0].values.every((value) => value === 0)
						? h('div', { key: 'empty', className: 'dtu-note' }, t('empty.slot'))
						: h(SlotLineChart, {
							key: 'chart',
							series: slotSeries,
							count: slotSeries[0].values.length,
							width: 1540,
							height: 320,
							wrapperClass: 'dtu-chart dtu-chart-flat',
							t: t,
							label: t('chart.slot.aria')
						})
				]),
				h('div', { key: 'overview', className: 'dtu-card dtu-card-center' }, [
					h('div', { key: 'head', className: 'dtu-card-head' }, [
						h('div', { key: 'title', className: 'dtu-card-title' }, t('card.alltime')),
						h('div', { key: 'note', className: 'dtu-note' }, allSince > 0 ? t('card.alltime.note', {
							since: fmtDate(allSince),
							sessions: Number(data.sessions) || 0,
							total: formatTokens(allTime.total)
						}) : '')
					]),
					allTimeModels.length === 0
						? h('div', { key: 'empty', className: 'dtu-note' }, t('empty.alltime'))
						: h(ModelTable, {
							key: 'table',
							caption: t('table.alltime.caption'),
							rows: allTimeModels,
							total: allTime.total,
							t: t,
							footer: [
								t('row.total'),
								formatTokens(allTime.input),
								formatTokens(allTime.cache),
								formatTokens(allTime.output),
								formatTokens(allTime.total),
								String(allTime.calls),
								allTime.total > 0 ? '100%' : '—'
							]
						})
				]),
				h('div', { key: 'foot', className: 'dtu-foot' }, [
					h('div', { key: 'updated', className: 'dtu-note' }, t('state.updated', {
						time: formatClock(Number(data.updatedAt) || Date.now()),
						zone
					})),
					...footnotes.map((text, index) => h('div', {
						key: `note-${index}`,
						className: 'dtu-warn'
					}, text))
				])
			]);
		}

		/**
		 * The Host half publishes the summary as an exact Fetch route under /api, so this
		 * plain same-origin POST rides the Host/Origin fence and browser authentication
		 * of that transport instead of a dedicated RPC channel.
		 */
		async function directCall(signal) {
			const response = await fetch(`/api${CHANNEL}/${ENDPOINT}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: '{}',
				signal
			});
			let envelope;
			try {
				envelope = await response.json();
			} catch {
				throw new Error(`transport failure for ${CHANNEL}/${ENDPOINT}: HTTP ${response.status}`);
			}
			if (envelope === null || typeof envelope !== 'object') {
				throw new Error(`unexpected response for ${CHANNEL}/${ENDPOINT}`);
			}
			if (envelope.ok !== true) {
				const detail = envelope.error !== null && typeof envelope.error === 'object' ? envelope.error.message : void 0;
				throw new Error(typeof detail === 'string' ? detail : `transport failure for ${CHANNEL}/${ENDPOINT}: HTTP ${response.status}`);
			}
			return envelope.value;
		}

		async function requestSummary(ctx, signal) {
			try {
				return await directCall(signal);
			} catch (error) {
				const connection = ctx.get('connection');
				const rpc = connection === null || connection === void 0 ? void 0 : connection.rpc;
				if (rpc !== null && rpc !== void 0 && typeof rpc.call === 'function') {
					return rpc.call(CHANNEL, ENDPOINT, {}, signal);
				}
				throw error;
			}
		}

		const inject = ['slots', 'locale'];

		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-token-usage: dictionaries');
			const t = ctx.locale.bind(NS);
			const injected = () => ({
				request: (signal) => requestSummary(ctx, signal),
				readLocaleRevision: () => ctx.locale.getSnapshot().revision,
				onLocaleChange: (listener) => ctx.locale.subscribe(listener)
			});
			// First-class sidebar entry (like the shipped Plugins / Schedules panels):
			// the panellist id addresses the matching main panel by the same id.
			ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
				name: 'sidebar.panellist',
				id: 'token-usage',
				order: 30,
				label: () => t('tab'),
				locale: NS,
				inject: injected
			}, TokenIcon));
			ctx.slots.inject('main', () => ctx.slots.register({
				name: 'main',
				key: 'token-usage',
				locale: NS,
				inject: injected
			}, TokenUsageTab));
		}

		return { inject, apply };
	}
});
