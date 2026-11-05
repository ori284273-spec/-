// Offline acceptance: no backend, no network, no reference image required.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true,offline:true});
    const page=await context.newPage(),errors=[],requests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    // Managed Chromium blocks file:// by enterprise policy. Fulfill a private
    // test origin entirely from the single HTML; no network or backend is used.
    await context.route('http://atelier.test/**',route=>route.fulfill({contentType:'text/html',body:fs.readFileSync('dist/闪彩关键词工坊.html','utf8')}));
    await page.goto('http://atelier.test/');
    await page.waitForSelector('#exportTxt');
    assert((await page.locator('#livePrompt').innerText()).includes('CHARACTER REFERENCE'));
    assert.equal(await page.locator('input[type=file]').count(),1); // backup only
    assert.equal(await page.locator('[data-keyword]').count(),10);
    await page.screenshot({path:'/tmp/atelier-keywords-desktop.png'});
    // Omitted words disappear from output and survive a reload.
    await page.locator('[data-keyword="0"]').uncheck();
    assert(!(await page.locator('#livePrompt').innerText()).includes('fine warm-brown contours'));
    await page.reload();await page.waitForSelector('#exportTxt');
    assert.equal(await page.locator('[data-keyword="0"]').isChecked(),false);
    // Cancel must discard draft edits.
    await page.locator('#editCurrent').click();
    await page.locator('.en').first().fill('UNSAVED');await page.locator('#closeModal').click();
    await page.locator('#editCurrent').click();assert(!(await page.locator('.en').first().inputValue()).includes('UNSAVED'));
    await page.locator('.en').first().fill('fine contours; varied line weight');
    await page.locator('[data-split="0"]').click();assert.equal(await page.locator('[data-index]').count(),11);
    await page.locator('[data-merge="1"]').click();assert.equal(await page.locator('[data-index]').count(),10);
    await page.locator('.enabled').first().check();await page.locator('#saveCard').click();
    assert((await page.locator('.cardheader').innerText()).includes('VERSION 2'));
    // Complete TXT export without any identity images or identity keywords.
    let wait=page.waitForEvent('download');await page.locator('#exportTxt').click();
    let dl=await wait;let text=fs.readFileSync(await dl.path(),'utf8');
    assert(text.includes('Use the character reference images supplied separately'));
    assert(text.includes('fine contours; varied line weight'));
    wait=page.waitForEvent('download');await page.locator('#exportJson').click();dl=await wait;
    const pack=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
    assert.deepEqual(pack.generation_images,[]);assert.equal(pack.reference_policy,'user_supplies_separately');
    assert(pack.sources.some(s=>s.card_id==='STYLE-001'&&s.card_version===2));
    wait=page.waitForEvent('download');await page.locator('#exportMd').click();dl=await wait;
    assert(fs.readFileSync(await dl.path(),'utf8').includes('观察依据')||fs.readFileSync(await dl.path(),'utf8').includes('依据：'));
    // Incomplete keyword-only identity must block export.
    await page.locator('[data-field="identityMode"]').selectOption('keywords');
    assert((await page.locator('#compileStatus').innerText()).includes('人物身份卡为空'));
    await page.locator('[data-field="identityMode"]').selectOption('external');
    // Unknown evidence and explicit conflicts are blocked.
    await page.locator('#editCurrent').click();await page.locator('.confidence').first().selectOption('unknown');await page.locator('#saveCard').click();
    assert((await page.locator('#compileStatus').innerText()).includes('无法确认'));
    await page.locator('#editCurrent').click();await page.locator('.confidence').first().selectOption('visual_estimate');
    await page.locator('.conflicts').first().fill('SHOT-001-01');await page.locator('#saveCard').click();
    assert((await page.locator('#compileStatus').innerText()).includes('词条冲突'));
    await page.locator('#editCurrent').click();await page.locator('.conflicts').first().fill('');await page.locator('#saveCard').click();
    // Add card, independent category, preserve all other selections.
    await page.locator('#newCard').click();await page.locator('#newName').fill('独立测试卡');await page.locator('#create').click();
    await page.locator('#addKeyword').click();await page.locator('.zh').fill('简洁线条');await page.locator('.en').fill('simple delicate lines');await page.locator('#saveCard').click();
    assert((await page.locator('#livePrompt').innerText()).includes('simple delicate lines'));
    assert((await page.locator('#livePrompt').innerText()).includes('landscape medium-close'));
    // Restore validates backup, makes recovery backup, and preserves snapshots.
    wait=page.waitForEvent('download');await page.locator('#backup').click();dl=await wait;
    const backup=fs.readFileSync(await dl.path());
    await page.locator('[data-page="help"]').click();await page.locator('#restore').click();
    await page.locator('#importFile').setInputFiles({name:'workspace.json',mimeType:'application/json',buffer:backup});
    await page.waitForSelector('#confirmRestore');wait=page.waitForEvent('download');await page.locator('#confirmRestore').click();await wait;
    await page.locator('[data-page="records"]').click();assert.equal(await page.locator('[data-record]').count(),3);
    await page.locator('[data-record]').first().click();assert((await page.locator('#modal').innerText()).includes('fine contours; varied line weight'));await page.locator('#closeModal').click();
    await page.locator('[data-page="studio"]').click();await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'/tmp/atelier-keywords-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);assert(requests.every(url=>url.startsWith('http://atelier.test/')));
    console.log('PASS self-contained HTML, offline isolated origin: load, no external requests, granular selection, persistence, edit/cancel, split/merge, versioned sources, TXT/JSON/MD downloads, image-free compilation, identity guard, unknown/conflict checks, new card, backup/restore, immutable records, mobile layout. file:// navigation is blocked by managed browser policy and is not verified here.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
