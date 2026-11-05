// Isolated acceptance workflow; uses a synthetic color card, never a real character.
const {chromium}=require('playwright');
const {spawn}=require('child_process');
const fs=require('fs'),os=require('os'),path=require('path'),assert=require('assert');
(async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'atelier-e2e-'));
 const server=spawn('python',['server.py','--port','3001'],{cwd:path.join(__dirname,'..'),env:{...process.env,ATELIER_DATA:data},stdio:'ignore'});
 let browser;
 try{
  for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3001/api/state')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3001');
  await page.locator('#compile').click();assert((await page.locator('#modal').innerText()).includes('母版为空'));await page.locator('#closeModal').click();
  // Import valid PNG through actual file UI.
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
  await page.locator('[data-page="identity"]').first().click();
  await page.locator('#files').setInputFiles({name:'synthetic-fixture.png',mimeType:'image/png',buffer:png});
  await page.waitForFunction(()=>document.querySelector('.refimage img'));
  await page.locator('[data-page="identity"]').first().click();await page.locator('#chooseRefs').click();await page.locator('#modal [data-image]').first().click();await page.locator('#faceVisible').check();await page.locator('#imageView').selectOption('正面');await page.locator('#addRef').click();
  await page.locator('#identityName').fill('Acceptance fixture');await page.locator('#identityCore').fill('Rounded chin, narrow upper eyelids, side-parted bangs');await page.locator('#saveIdentity').click();
  await page.locator('[data-page="studio"]').click();await page.locator('#match').click();await page.locator('[data-candidate="1"]').click();
  // Edit a style keyword, persist revision; split then merge without losing other fields.
  await page.locator('[data-edit="STYLE-001"]').click();await page.locator('.ken').first().fill('fine brown contours; softly interrupted edges');await page.locator('[data-split="0"]').click();assert.equal(await page.locator('[data-kw]').count(),6);await page.locator('[data-merge="1"]').click();assert.equal(await page.locator('[data-kw]').count(),5);await page.locator('#saveCard').click();
  await page.locator('[data-value="framing"]').selectOption('全身构图');await page.locator('#compile').click();assert((await page.locator('#modal').innerText()).includes('冲突'));await page.locator('#closeModal').click();await page.locator('[data-value="framing"]').selectOption('半身近景');
  await page.locator('#compile').click();await page.locator('#finishCompile').click();await page.waitForSelector('#exportPrompt');
  const text=await page.locator('.code').innerText();assert(text.includes('CHARACTER IDENTITY'));assert(!text.includes('REQUIRES TRANSLATION'));assert(text.includes('fine brown contours'));
  const saved=await (await fetch('http://127.0.0.1:3001/api/state')).json();assert.equal(saved.state.records.length,1);assert.deepEqual(saved.state.records[0].generation_images,[]);assert(saved.state.records[0].sources.some(s=>s.card_version===2));assert.equal(saved.state.identity.refs.length,1);
  await page.locator('#closeModal').click();await page.reload();await page.locator('[data-page="records"]').click();await page.locator('[data-result]').click();
  await page.locator('#resultUpload').click();await page.locator('#files').setInputFiles({name:'synthetic-result.png',mimeType:'image/png',buffer:png});await page.waitForSelector('#modal img[alt="生成结果"]');await page.locator('[data-review="人物一致性"]').selectOption('需微调');await page.locator('#reviewNote').fill('Synthetic acceptance test only');await page.locator('#saveReview').click();
  const reviewed=await (await fetch('http://127.0.0.1:3001/api/state')).json();assert.equal(reviewed.state.records[0].review['人物一致性'],'需微调');
  await page.setViewportSize({width:390,height:844});await page.locator('[data-page="studio"]').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/atelier-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: import → identity → story → edit/split/merge → conflict → English compile → source trace → reload → result review; mobile overflow check.');
 }finally{if(browser)await browser.close();server.kill();fs.rmSync(data,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1});
