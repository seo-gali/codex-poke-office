async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  check(new URL(page.url()).port === '4191', '합성 서버 4191에서만 삭제 검증을 실행합니다');
  const snapshot = async () => (await (await page.request.get('http://127.0.0.1:4191/api/sessions')).json()).sessions;
  await page.locator('.safari-symbol').first().waitFor();
  const before = await snapshot();
  check(before.length === 1 && before[0].projectName === 'browser-check', '합성 기록만 허용합니다');
  const fixed = await page.locator('.safari-symbol').first().getAttribute('style');
  const start = await page.locator('.player').getAttribute('style');
  await page.locator('.safari-view').click({ position: { x: 30, y: 150 } });
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(800); await page.keyboard.up('ArrowLeft');
  check(start !== await page.locator('.player').getAttribute('style'), '플레이어 이동 실패');
  check(fixed === await page.locator('.safari-symbol').first().getAttribute('style'), '고정 심볼 위치 변경');
  check(await page.getByRole('button', { name: 'E · 말 걸기', exact: true }).isEnabled(), '근접 판정 실패');
  await page.keyboard.press('e'); await page.locator('.encounter-dialog[open]').waitFor();
  check(await page.locator('#encounter-title').textContent() === 'pikachu', '세션 포켓몬 불일치');
  await page.screenshot({ path: 'data/safari-fixture-encounter.png', fullPage: true });
  await page.getByRole('button', { name: '포켓몬 놓아주기 ↗' }).click();
  const confirm = page.locator('.release-dialog'); await confirm.waitFor({ state: 'visible' });
  check((await confirm.innerText()).includes('영구 삭제'), '원본 삭제 안내 누락');
  await confirm.getByRole('button', { name: '곁에 두기', exact: true }).click();
  check((await snapshot()).length === 1, '취소한 기록이 소실됨');
  await page.getByRole('button', { name: '포켓몬 놓아주기 ↗' }).click();
  await confirm.getByRole('button', { name: '기록 삭제하고 놓아주기', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.safari-symbol').length === 0);
  check((await snapshot()).length === 0, '확인 후 삭제 실패');
  check(!await page.locator('.encounter-dialog').isVisible(), '삭제 후 인카운터가 남음');
  return { movement: true, fixedSymbol: true, encounter: true, cancelPreserves: true, confirmedDeletion: true };
}
