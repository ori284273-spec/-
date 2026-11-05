const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const root='http://127.0.0.1:3000';
 const v=await fetch(root+'/api/version');assert.deepEqual(await v.json(),{version:'4.2',characters:28,images:76,entry:'static/index.html'});
 const initial=await fetch(root+'/');assert(initial.headers.get('cache-control').includes('no-store'));assert.equal(initial.headers.get('x-atelier-version'),'4.2');
 assert((await initial.text()).includes('闪彩人物库 V4.2'));
 const conditional=await fetch(root+'/',{headers:{'If-Modified-Since':initial.headers.get('last-modified')}});assert.equal(conditional.status,200);
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(root);
  await page.waitForSelector('.release-bar');assert((await page.locator('.release-bar').innerText()).includes('V4.2 用户原图版'));
  assert.equal(await page.locator('[data-character-edit]').count(),28);await page.waitForFunction(()=>document.querySelectorAll('.character-original img').length===28);
  assert((await page.locator('.content').innerText()).includes('大崎甘奈'));
  await page.screenshot({path:'/tmp/preview-v4.2.png'});assert.deepEqual(errors,[]);
  console.log('PASS live preview: actual HTTP build 4.2, 28 names and 76 user originals, default character page, no stale conditional response, no browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
