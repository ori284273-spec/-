const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1440,height:1000}});
  await context.route('http://characters.test/**',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync('dist/闪彩关键词工坊.html','utf8')}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://characters.test');await page.waitForSelector('#characterSelect');
  assert.equal(await page.locator('#characterSelect option').count(),29);
  assert((await page.locator('#selectCard').inputValue())==='STYLE-003');
  let prompt=await page.locator('#livePrompt').innerText();
  assert(prompt.includes('CHAR-01'));assert(prompt.includes('mostly crisp edges'));assert(!prompt.includes('subtle fine-grain surface texture'));
  await page.locator('[data-page="characters"]').first().click();
  assert.equal(await page.locator('[data-character-edit]').count(),28);
  assert.equal(await page.locator('.character-original img').count(),0); // no synthetic image masquerades as source
  await page.screenshot({path:'/tmp/characters-v3.png'});
  await page.locator('[data-character-use="CHAR-20"]').click();
  await page.locator('[data-character-edit="CHAR-20"]').click();
  assert((await page.locator('[data-profile-field="faceEn"]').inputValue()).includes('warm tan'));
  await page.locator('#profileName').fill('人物 20 校准名');await page.locator('#profileConfirmed').check();await page.locator('#profileSave').click();
  await page.locator('[data-page="studio"]').click();await page.locator('#characterView').selectOption('profile');await page.locator('#characterScene').selectOption('seaside');
  prompt=await page.locator('#livePrompt').innerText();assert(prompt.includes('warm tan'));assert(prompt.includes('occlude the far eye'));assert(prompt.includes('seaside path'));assert(!prompt.includes('tracks receding'));assert(prompt.includes('both feet visible'));
  let wait=page.waitForEvent('download');await page.locator('#exportJson').click();let dl=await wait;
  const pack=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
  assert.equal(pack.character.id,'CHAR-20');assert.equal(pack.character.view,'profile');assert.equal(pack.character.character_snapshot.version,2);assert.deepEqual(pack.generation_images,[]);
  await page.reload();await page.waitForSelector('#characterSelect');assert.equal(await page.locator('#characterSelect').inputValue(),'CHAR-20');
  await page.locator('[data-category="shot"]').click();await page.locator('#selectCard').selectOption('SHOT-001');assert((await page.locator('#compileStatus').innerText()).includes('近景'));await page.locator('#characterScale').selectOption('medium');assert(!(await page.locator('#compileStatus').innerText()).includes('近景'));
  // Store an exact synthetic PNG in IndexedDB through the actual original association UI.
  await page.locator('[data-page="characters"]').first().click();
  const chooser=page.waitForEvent('filechooser');await page.locator('[data-character-upload="CHAR-20"]').click();const f=await chooser;
  await f.setFiles({name:'synthetic-original.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await page.waitForSelector('[data-original="CHAR-20"] img');
  const second=page.waitForEvent('filechooser');await page.locator('[data-character-upload="CHAR-20"]').click();const secondInput=await second;
  await secondInput.setFiles({name:'synthetic-side.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('shancai-character-originals',1);r.onsuccess=()=>resolve(r.result);});return await new Promise(resolve=>{const r=db.transaction('images').objectStore('images').get('CHAR-20');r.onsuccess=()=>resolve(r.result?.items?.length===2);});});
  wait=page.waitForEvent('download');await page.locator('#characterBackup').click();dl=await wait;const chars=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));assert.equal(chars.characters.length,28);assert.equal(chars.originals.length,1);assert.equal(chars.originals[0].items.length,2);assert.equal(chars.originals[0].items[0].name,'synthetic-original.png');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('PASS: 28 profiles; no rejected turnaround used; corrected cel style; independent identities; editable calibration; profile occlusion; natural full-body constraints; four scenes; source snapshots; reload; framing conflicts; exact original association; character backup; mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
