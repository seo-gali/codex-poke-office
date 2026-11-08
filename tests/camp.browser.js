async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  check(new URL(page.url()).port === '4191', '합성 서버 4191에서만 실행합니다');
  // Codex 프로세스를 실행하지 않는 UI 상태 픽스처
  await page.route('**/api/events', async route => {
    const data = await (await page.request.get('http://127.0.0.1:4191/api/sessions')).json();
    const sample = data.sessions.find(s => s.activity.kind === 'tool');
    sample.usage = 'active'; sample.observation = 'recent-event'; sample.activity.at = new Date().toISOString();
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify(data)}\n\n` });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => localStorage.setItem('poke-office-trainer', 'red'));
  await page.reload(); await page.locator('.camp-station').first().waitFor();
  const snapshot = async () => (await (await page.request.get('http://127.0.0.1:4191/api/sessions')).json()).sessions;
  const before = await snapshot(), active = before.find(s => s.activity.kind === 'tool'), quiet = before.find(s => s.activity.kind === 'unknown');
  check(before.length === 3 && before.every(s => s.projectName === 'browser-check'), '합성 기록만 허용합니다');
  check(active && quiet && quiet.usage === 'inactive', '사용 중·미사용 합성 기록 누락');
  check(await page.getByRole('button', { name: '탐험', exact: true }).count() === 0, '탐험 탭이 남음');
  check(await page.locator('.safari-view, .map-controls').count() === 0, '지도 기능이 남음');
  check(await page.locator('.lab-architecture image[href="/lab/floor.png"]').count() >= 100, '아이소메트릭 바닥 누락');
  check(await page.locator('.lab-architecture image[href="/lab/wall.png"]').count() >= 8, '방의 두 벽 누락');
  for (const name of ['floor', 'wall', 'desk', 'monitor']) {
    const asset = await page.request.get(`http://127.0.0.1:4191/lab/${name}.png`);
    check(asset.ok() && asset.headers()['content-type'] === 'image/png', `연구실 ${name} 이미지 제공 실패`);
  }
  const station = id => page.locator(`.camp-station[data-session="${id}"]`);
  await page.waitForFunction(id => document.querySelector(`.camp-station[data-session="${id}"] img.sprite`)?.src.endsWith('.gif'), active.sessionId);
  await page.waitForFunction(id => document.querySelector(`.camp-station[data-session="${id}"] img.sprite`)?.src.endsWith('.png'), quiet.sessionId);
  check(await station(active.sessionId).getAttribute('data-working') === 'true', '최근 활동 작업 반응 누락');
  const complete = before.find(s => s.activity.kind === 'complete');
  check(await station(complete.sessionId).getAttribute('data-working') === 'false', '완료 기록에 작업 반응 표시');
  check(await station(complete.sessionId).locator('img.sprite').getAttribute('src').then(src => src.endsWith('.png')), '완료된 동료의 GIF 미정지');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(id => document.querySelector(`.camp-station[data-session="${id}"] img.sprite`)?.src.endsWith('.png'), active.sessionId);
  check(await station(active.sessionId).getAttribute('data-working') === 'false', '모션 감소 미반영');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const select = page.getByRole('combobox', { name: '트레이너 선택' });
  const options = await select.locator('option').evaluateAll(es => es.map(e => ({ id: e.value, name: e.textContent.split(' · ')[0] })));
  check(options.length === 15 && options.some(o => o.name === '영태') && options.some(o => o.name === '미월'), '세대별 트레이너 누락');
  const choose = async id => { await select.selectOption(id); await page.waitForFunction(id => { const e = document.querySelector('[aria-label="트레이너 선택"]'); return e.value === id && !e.disabled; }, id); };
  const portraits = [];
  for (const { id, name } of options) {
    await choose(id);
    await page.waitForFunction(name => document.querySelector(`.camp-trainer [aria-label="내 트레이너 · ${name}"] img`)?.src.startsWith('data:'), name);
    check(await page.locator('.camp-trainer-sprite').evaluate(e => e.getBoundingClientRect().height >= 70), `${name} 표시 크기가 작음`);
    await station(active.sessionId).click();
    await page.waitForFunction(() => document.querySelector('.encounter-trainer img')?.naturalWidth === 64);
    const colors = await page.locator('.encounter-trainer img').evaluate(e => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const x = c.getContext('2d'); x.drawImage(e, 0, 0); const d = x.getImageData(0, 0, 64, 64).data, colors = new Set();
      for (let i = 0; i < d.length; i += 4) if (d[i + 3]) colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      return { colors: colors.size, transparent: d[3] === 0 };
    });
    check(colors.colors >= 8 && colors.transparent, `${name} 풀컬러 또는 투명 배경 오류`);
    portraits.push({ name, html: await page.locator('.encounter-trainer .trainer').evaluate(e => e.outerHTML) });
    check(await page.locator('.encounter-actions button').count() === 4, '네 칸 메뉴 누락');
    check(await page.getByRole('button', { name: '포켓몬 놓아주기 ↗' }).isDisabled(), '사용 중인 기록 보호 실패');
    await page.getByRole('button', { name: '캠프로 돌아가기', exact: true }).click();
  }
  const preview = await page.context().newPage(); await preview.setViewportSize({ width: 800, height: 700 });
  await preview.setContent(`<style>body{display:grid;grid-template-columns:repeat(5,1fr);background:#bdd48c;gap:12px;font:14px sans-serif}.trainer{display:block;position:relative;overflow:hidden;width:128px;height:128px}.trainer img{position:absolute;image-rendering:pixelated}</style>${portraits.map(p => `<div>${p.name}${p.html}</div>`).join('')}`);
  await preview.screenshot({ path: 'data/camp-trainer-portraits.png', fullPage: true }); await preview.close();
  const previous = await snapshot(); await choose('elio'); await choose('gloria');
  const changed = await snapshot();
  check(changed.every(s => s.pokemon.gloria.id !== previous.find(old => old.sessionId === s.sessionId).pokemon.gloria.id), '트레이너 복귀 시 재배정되지 않음');
  check(new Set(changed.map(s => s.pokemon.gloria.id)).size === 3, '재배정한 종이 중복됨');
  const order = await page.locator('.camp-station').evaluateAll(es => es.map(e => e.dataset.session));
  await page.reload(); await page.locator('.camp-station').first().waitFor();
  check(await select.inputValue() === 'gloria', '트레이너 선택 저장 실패');
  check(JSON.stringify((await snapshot()).map(s => s.pokemon.gloria.id)) === JSON.stringify(changed.map(s => s.pokemon.gloria.id)), '새로고침 시 배정이 바뀜');
  check(JSON.stringify(await page.locator('.camp-station').evaluateAll(es => es.map(e => e.dataset.session))) === JSON.stringify(order), '새로고침 시 배치 변경');
  const position = await station(active.sessionId).getAttribute('style');
  await page.getByRole('button', { name: '사용 중', exact: true }).click(); check(await page.locator('.camp-station').count() === 1, '사용 중 필터 실패');
  check(await station(active.sessionId).getAttribute('style') === position, '필터가 작업대 위치를 바꿈');
  await page.getByRole('button', { name: '사용 안 함', exact: true }).click(); check(await page.locator('.camp-station').count() === 2, '미사용 필터 실패');
  await page.getByRole('button', { name: '모두', exact: true }).click();
  await station(quiet.sessionId).click();
  await page.getByRole('button', { name: '정보 보기', exact: true }).click();
  check((await page.locator('.encounter-info').innerText()).includes(quiet.sessionId), '정보 패널 누락');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4191' });
  await page.getByRole('button', { name: '세션 ID 복사', exact: true }).click();
  check(await page.evaluate(() => navigator.clipboard.readText()) === quiet.sessionId, 'ID 복사 실패');
  await page.getByRole('button', { name: '도감 보기', exact: true }).click();
  check((await page.locator('.pokedex-panel').innerText()).includes('합성 도감 설명'), '도감 누락');
  for (const [width, height] of [[390, 844], [320, 480], [844, 390], [568, 320]]) {
    await page.setViewportSize({ width, height });
    check(await page.locator('.encounter-dialog').evaluate(e => { const b = e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight; }), '세션 상세 화면 넘침');
    await page.getByRole('button', { name: '캠프로 돌아가기', exact: true }).click();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), `${width}x${height} 페이지 넘침`);
    await page.locator('.camp-trainer').scrollIntoViewIfNeeded();
    check(await page.locator('.camp-trainer').isVisible(), '연구실 입구에 접근할 수 없음');
    await station(active.sessionId).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `data/camp-fixture-${width}x${height}.png`, fullPage: true });
    await station(quiet.sessionId).click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '포켓몬 놓아주기 ↗' }).click();
  await page.getByRole('button', { name: '곁에 두기', exact: true }).click();
  check((await snapshot()).length === 3, '놓아주기 취소 시 소실');
  await page.getByRole('button', { name: '포켓몬 놓아주기 ↗' }).click();
  await page.getByRole('button', { name: '기록 삭제하고 놓아주기', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.camp-station').length === 2);
  check((await snapshot()).every(s => s.sessionId !== quiet.sessionId), '확인한 기록 삭제 실패');
  const loading = await page.context().newPage(); let release;
  const gate = new Promise(resolve => { release = resolve; });
  await loading.route('**/overworlds/*.webp', async route => { await gate; await route.continue(); });
  await loading.goto('http://127.0.0.1:4191', { waitUntil: 'domcontentloaded' });
  await loading.locator('.camp-trainer .trainer-loading').waitFor();
  check(await loading.locator('.camp-trainer svg').count() === 0, '로딩용 임시 사람 그림이 남음');
  await loading.screenshot({ path: 'data/camp-trainer-loading.png', fullPage: true }); release();
  await loading.locator('.camp-trainer .trainer-art img').waitFor(); await loading.close();
  const failed = await page.context().newPage();
  await failed.route('**/overworlds/*.webp', route => route.abort());
  await failed.goto('http://127.0.0.1:4191'); await failed.locator('.camp-trainer .trainer-error').waitFor();
  await failed.screenshot({ path: 'data/camp-trainer-error.png', fullPage: true }); await failed.close();
  await page.unroute('**/api/events');
  return { campOnly: true, trainers: 15, publicPortraits: true, activeMotion: true, inactiveStill: true, reducedMotion: true, reshuffle: true, refreshPreserves: true, filters: true, info: true, pokedex: true, clipboard: true, responsive: true, release: true, loading: true, loadError: true };
}
