/* Offline keyword studio. References are supplied by the user at generation time. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const id = p => p + '-' + Math.random().toString(36).slice(2, 10);
  const clone = o => JSON.parse(JSON.stringify(o));
  const STORE = 'shancai-keywords-v2';
  const categories = {style:'绘画风格',shot:'构图视角',narrative:'剧情互动',pose:'动作关系',setting:'场景空间',lighting:'光照表现',palette:'色彩搭配',identity:'人物身份'};
  const scopes = {style:'rendering_only',shot:'composition_only',narrative:'story_and_interaction',pose:'pose_and_contact',setting:'environment_only',lighting:'lighting_only',palette:'palette_only',identity:'stable_identity'};
  const evidence = {visual_estimate:'视觉估计',observed:'可观察事实',design:'创作方案',unknown:'无法确认'};
  function makeCard(cid, category, name, source, rows, exclusions = []) {
    return {id:cid, category, name, source, version:1, exclusions, history:[], keywords:rows.map((r,i) => ({id:cid+'-'+String(i+1).padStart(2,'0'), part:r[0], description_zh:r[1], prompt_en:r[2], basis:r[3], scope:scopes[category], confidence:source.includes('用户第一张')?'visual_estimate':'design', enabled:true, confirmed:false, conflicts:[]}))};
  }
  const seeds = [
    makeCard('STYLE-001','style','夕映 · 透明薄涂','用户第一张风格图 · 人工视觉观察',[
      ['轮廓线','细而柔和的暖棕色轮廓，线重随部位变化','fine warm-brown contours with subtle variation in line weight','头发与衣褶边界较清晰，脸颊轮廓较柔；不推断具体笔刷。'],
      ['线条密度','五官与发束保留结构线，皮肤区域减少勾线','selective structural lines around facial features and hair groups, sparse lines on skin','眼睛和发束分界线比皮肤内部密集。'],
      ['上色方式','平整色块与透明叠色结合，避免厚重堆涂','thin translucent color layers over simplified base-color shapes','可见色块组织与薄涂感；透明度是视觉估计。'],
      ['阴影层次','少量主阴影色阶，明暗交界轻微软化','a small number of primary shadow steps with gently softened transitions','不将画面局部强逆光误作所有场景的固定明暗。'],
      ['高光形态','不规则片状高光，避免均匀塑料反光','selective irregular highlight shapes rather than continuous glossy bands','头发亮部集中，未见每束等宽发光条。'],
      ['皮肤画法','薄而通透的肤色，脸颊局部轻微红润','delicate translucent skin shading with localized soft blush','只描述画法，不继承原人物脸型或固定肤色。'],
      ['头发组织','先分大色块发束，再以少量细线补充','group hair into broad painted locks with restrained fine-strand detail','发丝有流向，但不逐根平均描绘。'],
      ['背景处理','背景材质简化为绘画色块，细节密度低于脸部','simplified painted background shapes with lower detail density than the face','保持人物与背景绘画语言一致，不锁定车站等物件。'],
      ['表面纹理','轻微细颗粒质感，避免粗糙噪点覆盖五官','subtle fine-grain surface texture without obscuring facial features','颗粒可能来自后期或原图处理，具体来源无法确认。'],
      ['边缘处理','局部清晰、柔化与消失边缘交替','selective hard, soft, and lost edges, retaining clear facial structure','原图亮部边界较弱；不要求所有场景都过曝。']
    ],['source_character_identity','source_outfit','source_scene_objects','source_composition','source_lighting','source_palette']),
    makeCard('SHOT-001','shot','回眸 · 横幅半身','用户第一张风格图 · 独立构图观察',[
      ['画幅与范围','横幅半身近景，脸部与上身构成主体','landscape medium-close composition centered on the face and upper body','以可见裁切判断，不虚构镜头焦距。'],
      ['人物位置','脸部偏左上，右侧留出发丝流动空间','place the face toward the upper left, leaving space on the right for flowing hair','人物未置于画面正中。'],
      ['机位与倾斜','略有倾斜的观看角度，增强瞬间感','a slightly tilted camera angle for a spontaneous moment','倾斜方向以原图为参考，不写精确角度。'],
      ['目光关系','人物回头回应观看者，目光接近镜头','the character turns back to acknowledge the viewer with near-camera eye contact','笑容和对视可见，人物真实动机无法确认。'],
      ['视觉引导','发束与环境斜线将注意力带回脸部','use flowing hair and environmental diagonals to guide attention back to the face','只提取线性引导，不继承原建筑。']
    ],['source_identity','source_outfit','source_style','source_lighting']),
    makeCard('LIGHT-001','lighting','夕照 · 柔暖侧逆光','用户第一张风格图 · 独立光照观察',[
      ['主光方向','画面右上方暖光，头发与肩部出现亮边','warm light from the upper right creates rim light on hair and shoulders','根据亮边推测方向，不声称测得色温。'],
      ['面部可读性','面部保持可读，阴影中保留五官','keep facial features readable with soft fill in the shadowed face','侧逆光下仍能辨认眼鼻嘴。'],
      ['绘画转译','亮部边界柔化，避免全画面同等辉光','soften selected light-facing edges without applying uniform bloom everywhere','局部溢光不同于整张图覆盖滤镜。'],
      ['暗部组织','暗部色彩保留，不压成纯黑','preserve local color in shadows instead of crushing them to black','发束阴影仍有棕色层次。']
    ],['source_identity','source_scene_objects']),
    makeCard('COLOR-001','palette','暖金 · 低饱和玫瑰','用户第一张风格图 · 独立色彩观察',[
      ['主辅色','奶油金亮部搭配低饱和玫瑰色','creamy golden lights paired with muted rose accents','暖色占比较高；未做像素统计。'],
      ['深色锚点','棕色深色块锚定头发与结构','warm brown dark shapes provide visual anchors','色彩角色可复用，不要求人物头发必须棕色。'],
      ['肤色保护','保持自然肤色变化，避免全部染成黄色','retain natural skin-color variation rather than tinting all skin yellow','局部固有色仍需保留。'],
      ['饱和度分布','柔和整体配色，保留局部色彩差异','a restrained overall palette with selective local-color variation','低饱和不等于统一灰色。']
    ],['source_identity','fixed_hair_color']),
    makeCard('STORY-001','narrative','离别前 · 未说完的话','创作方案 · 非原图剧情事实',[
      ['故事瞬间','离开前短暂停顿，仍有话没说完','a brief pause before parting, with something left unsaid','事件位于告别发生前。'],
      ['视觉证据','指尖攥住衣袖，嘴唇微张','fingers lightly grip a sleeve and lips remain slightly parted','通过可见行为表达迟疑。'],
      ['观看者关系','第一人称观看者在场，但不出现在画面里','the first-person viewer is present but remains offscreen','观看者不等于额外画出一双手。'],
      ['人物目标','想转身离开，却又试图回应呼唤','she is about to leave but turns to respond to the viewer calling her','通过身体朝向与回头的反差组织叙事。']
    ]),
    makeCard('POSE-001','pose','停步 · 轻轻回头','创作方案 · 可与离别剧情搭配',[
      ['身体朝向','身体朝前，头部适度转回','body facing forward, head gently turned back toward the viewer','避免头部扭转超过自然活动范围。'],
      ['手部动作','一只手轻握衣袖，另一只手自然放松','one hand lightly grips the sleeve while the other rests naturally','手指归属明确，不额外复制手臂。'],
      ['重心与动态','停步时重心稳定，发丝有少量惯性','balanced body weight during a pause, with a little residual movement in the hair','静止身体与轻微发丝动态共存。']
    ]),
    makeCard('SCENE-001','setting','傍晚 · 安静的站台','创作方案 · 非原图场景确认',[
      ['空间','安静的站台，远处轨道延伸','a quiet station platform with tracks receding into the distance','背景空间给离别提供语境。'],
      ['层次','人物近景，站台中景，远处简化','foreground character, midground platform, simplified distant scenery','环境不能抢走脸部的细节焦点。'],
      ['叙事物件','远处列车暗示时间正在逼近','a distant train suggests an approaching moment of departure','物件服务剧情，不无差别堆砌。']
    ]),
    makeCard('STYLE-002','style','清透 · 水彩晕染','可替换画法方案 · 非第一张图的事实拆解',[
      ['轮廓','纤细而局部开放的轮廓','delicate partially open contours','替换画法，保留人物结构。'],
      ['上色','透明水彩色层与少量湿边晕染','transparent watercolor washes with selective soft wet edges','画法方案，不模拟真实颜料参数。'],
      ['边缘','脸部清晰，衣服与背景局部融合','clear facial structure with selective soft merging of clothing and background','控制边缘清晰度优先级。'],
      ['纹理','轻微纸张肌理，不覆盖眼睛细节','subtle paper texture that does not obscure the eyes','局部细节仍然可读。']
    ],['source_character_identity','source_scene_objects','source_palette','source_lighting']),
    makeCard('SHOT-002','shot','全身 · 环境叙事','可替换构图方案',[
      ['景别','人物全身与脚下接触面均可见','full-body composition with feet and ground contact visible','与半身构图二选一。'],
      ['透视','眼平视角，人物比例自然','eye-level viewpoint with natural body proportions','不附加无依据的相机参数。'],
      ['环境关系','环境物件形成叙事背景','environmental objects provide narrative context without overpowering the character','保留空间信息。']
    ]),
    makeCard('COLOR-002','palette','夏日 · 清透蓝白','可替换配色方案',[
      ['主色','清透蓝白搭配小面积暖色','clear blue and white with small warm accents','配色独立于画风。'],
      ['肤色','环境偏冷，肤色仍自然','cool surroundings with natural skin tones','避免皮肤统一偏蓝。']
    ]),
    makeCard('IDENTITY-001','identity','人物身份 · 可选补充','由你对照自己的参考图填写',[],['source_style','source_outfit','source_lighting'])
  ];
  const correctedStyle=makeCard('STYLE-003','style','立绘校正 · 清晰赛璐璐','新人物附件人工观察；替代偏写实的旧拆解',[
    ['五官语言','清晰图形化眼睛、小鼻嘴，不做写实骨相塑造','clean graphic anime eyes, small simplified nose and mouth; avoid realistic facial anatomy','根据这批立绘可见形态，保留每个人物独立眼型。'],
    ['线条','纤细清晰的深色轮廓，不用铅笔断线','thin clean dark contours with controlled line-weight variation; no broken pencil sketch lines','立绘外轮廓闭合，脸部与发束结构明确。'],
    ['底色','稳定固有色与平整色块','stable local colors in clean flat base-color regions','不是整张图盖暖黄或褪色滤镜。'],
    ['阴影','一至两层简洁赛璐璐阴影，边界明确','one or two simplified cel-shadow steps with mostly crisp edges','阴影颜色与肤色分离，不用厚重渐层塑形。'],
    ['高光','少量发束片状高光，皮肤不画摄影反光','restrained grouped hair highlights; no photographic skin speculars','脸颊可有小范围红润，不渲染毛孔。'],
    ['材质与背景','人物优先、材质简化、背景保持绘画表达','simplified illustrated materials and a subordinate painted background; no photorealistic textures, paper grain or cinematic blur','原图白底不等于多场景都白底，场景应另外指定。']
  ],['photographic_skin','paper_grain','global_sepia_filter','realistic_materials','source_costume','source_pose']);
  correctedStyle.keywords.forEach(k=>k.confidence='visual_estimate');
  seeds.push(correctedStyle);
  const initial = {schema:'shancai-keywords/2',cards:seeds,selection:{style:'STYLE-003',shot:'SHOT-002',narrative:'STORY-001',pose:'POSE-001',setting:'SCENE-001',lighting:'',palette:'',identity:'IDENTITY-001'},characterName:'',identityMode:'external',outfitZh:'日常针织衫',outfitEn:'a casual knitted cardigan',extraZh:'',extraEn:'',negative:'photorealistic face; skin pores; paper grain; heavy atmospheric haze; global sepia filter; elongated legs; compressed torso; chibi proportions; duplicated limbs; inconsistent facial structure',records:[]};
  let state = clone(initial), page = 'studio', category = 'style', search = '', memoryOnly = false;
  try { const raw = localStorage.getItem(STORE); if(raw) state = validate(JSON.parse(raw)); } catch { memoryOnly = true; }
  if(!state.cards.some(c=>c.id==='STYLE-003'))state.cards.push(clone(correctedStyle));
  if(!state.characters){state.selection.style='STYLE-003';state.selection.shot='SHOT-002';state.selection.lighting='';state.selection.palette='';}
  window.CharacterStudio.init(state);
  function validate(s) {
    if(s?.schema!=='shancai-keywords/2'||!Array.isArray(s.cards)||!s.cards.length||!s.selection||!Array.isArray(s.records)) throw Error('不是本版本的工作空间备份');
    const ids=new Set();
    for(const c of s.cards) {
      if(!c.id||ids.has(c.id)||!categories[c.category]||!Array.isArray(c.keywords)||!Array.isArray(c.history)||!Array.isArray(c.exclusions)||typeof c.name!=='string'||typeof c.source!=='string'||!Number.isInteger(c.version)) throw Error('卡片结构或 ID 无效');
      ids.add(c.id);
      for(const k of c.keywords) if(!k.id||typeof k.description_zh!=='string'||typeof k.prompt_en!=='string'||!evidence[k.confidence]||!Array.isArray(k.conflicts)) throw Error('关键词结构无效');
    }
    if(!['external','keywords'].includes(s.identityMode)) throw Error('人物输入模式无效');
    if(s.characters){
      if(!Array.isArray(s.characters)||s.characters.length>500)throw Error('人物库格式无效');
      const characterIds=new Set();
      for(const c of s.characters){if(!c.id||characterIds.has(c.id)||!['name','source','faceEn','hairEn','faceZh','hairZh','front','quarter','profile','body','note','avoid'].every(k=>typeof c[k]==='string'))throw Error('人物身份字段无效');characterIds.add(c.id);}
      if(s.characterId&&!characterIds.has(s.characterId))throw Error('人物引用无效');
      if(!['front','quarter','profile'].includes(s.characterView)||!['station','classroom','street','seaside'].includes(s.characterScene)||!['full','medium'].includes(s.characterScale))throw Error('人物视角或比例模式无效');
    }
    for(const k of ['characterName','outfitZh','outfitEn','extraZh','extraEn','negative']) if(typeof s[k]!=='string') throw Error('文本字段格式无效');
    for(const [cat,cid] of Object.entries(s.selection)) if(!categories[cat]||(cid&&!s.cards.some(c=>c.id===cid&&c.category===cat))) throw Error('所选卡片引用无效');
    for(const r of s.records) if(typeof r.prompt!=='string'||!Array.isArray(r.sources)||!Array.isArray(r.generation_images)) throw Error('历史记录结构无效');
    return s;
  }
  function save() {
    try { localStorage.setItem(STORE,JSON.stringify(state)); memoryOnly=false; }
    catch { memoryOnly=true; toast('浏览器无法保存或空间不足。请导出 JSON 备份；当前修改仍可导出。'); }
    const status=$('#saveStatus'); if(status) status.textContent=memoryOnly?'临时使用 · 请导出备份':'已保存在此浏览器';
  }
  function toast(t) { $('#toast').textContent=t; $('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4500); }
  function download(name, data, type='application/json') {
    const a=document.createElement('a'), url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const card = cid => state.cards.find(c=>c.id===cid);
  const chosen = cat => card(state.selection[cat]);
  const active = c => (c?.keywords||[]).filter(k=>k.enabled);
  function compile() {
    const sources=[], blocks=[], errors=[];
    const add=(label,txt,source)=>{if(txt.trim()){blocks.push(label+'\n'+txt.trim());if(source)sources.push(source);}};
    const character=window.CharacterStudio.compile(state);
    if(character)add('CHARACTER IDENTITY AND PROPORTIONS',character.text,character.source);
    if(state.identityMode==='external') add('CHARACTER REFERENCE',`Use the character reference images supplied separately by the user as the identity source. Preserve the facial outline, eye shape and spacing, feature placement, hair divisions and recognizable marks across style, scene and outfit changes. Inherit identity only; do not copy the reference outfit, background, pose or lighting. ${state.characterName?'Character label: '+state.characterName+'.':''}`,{id:'USER-REFERENCE-INSTRUCTION',source:'用户自行提供参考图的输入策略',version:1});
    if(state.identityMode==='keywords'&&!character&&!active(chosen('identity')).length) errors.push('已选择“身份关键词”模式，但人物身份卡为空。请补充特征，或切回“自行提供人物参考图”。');
    for(const cat of ['identity','narrative','pose','shot','setting','lighting','palette','style']) {
      const c=chosen(cat), keys=active(c);
      if(!keys.length) continue;
      for(const k of keys){if(k.confidence==='unknown') errors.push(c.name+'：含“无法确认”词条，请先禁用或核实。');if(!k.prompt_en.trim()||/[\u3400-\u9fff]/.test(k.prompt_en)) errors.push(c.name+'：英文关键词为空或含中文。');sources.push({...clone(k),card_id:c.id,card_name:c.name,card_version:c.version,source:c.source,exclusions:[...c.exclusions]});}
      add(({identity:'IDENTITY CORE',narrative:'STORY AND INTERACTION',pose:'POSE AND CONTACT',shot:'COMPOSITION',setting:'SETTING',lighting:'LIGHTING',palette:'PALETTE',style:'RENDERING METHOD'})[cat],[...new Set(keys.map(k=>k.prompt_en.trim()))].join('; ')+'.');
    }
    const all=Object.keys(categories).flatMap(cat=>active(chosen(cat)));
    for(const k of all) if(k.conflicts.some(cid=>all.some(x=>x.id===cid))) errors.push('词条冲突：'+k.id);
    const shot=active(chosen('shot')).map(k=>k.prompt_en).join(' ');
    if(character&&state.characterScale==='full'&&/medium.close|close.up/i.test(shot))errors.push('人物选择了全身比例，但构图卡为近景，请切换全身构图卡或改人物范围。');
    if(/full.body/i.test(shot)&&/medium.close|close.up|80 percent/i.test(shot))errors.push('构图同时包含全身与近景，请禁用冲突词条。');
    const pose=active(chosen('pose')).map(k=>k.prompt_en).join(' ');
    if(/both hands.*rest|both arms.*down/i.test(pose)&&/offer.*umbrella|extend.*hand/i.test(pose))errors.push('双手垂下与伸手递物同时启用，请调整动作。');
    if(state.outfitZh.trim()&&!state.outfitEn.trim())errors.push('服装已填写中文，请补充英文或清空服装。');
    if(state.extraZh.trim()&&!state.extraEn.trim())errors.push('补充要求已填写中文，请补充对应英文。');
    if(/[\u3400-\u9fff]/.test(state.outfitEn+state.extraEn+state.negative))errors.push('英文服装、补充要求或负面词含中文，请修改后导出。');
    add('TEMPORARY OUTFIT',state.outfitEn,{id:'USER-OUTFIT',description_zh:state.outfitZh,prompt_en:state.outfitEn,source:'用户服装补充',version:1});
    add('ADDITIONAL DIRECTIONS',state.extraEn,{id:'USER-EXTRA',description_zh:state.extraZh,prompt_en:state.extraEn,source:'用户补充要求',version:1});
    const exclusions=[...new Set(Object.keys(categories).flatMap(cat=>chosen(cat)?.exclusions||[]))];
    add('SCOPE AND IDENTITY PROTECTION','Apply rendering keywords to drawing technique only. Keep character identity, composition, clothing, scene objects, lighting and palette in their respective scopes. Preserve coherent anatomy, perspective and physical contact.');
    if(state.negative.trim())add('AVOID',state.negative,{id:'USER-NEGATIVE',prompt_en:state.negative,source:'用户可编辑负面约束',version:1});
    if(character&&state.characterScene!=='station'&&state.selection.setting==='SCENE-001')errors.push('人物场景已切换，但仍选用了车站场景卡；请在场景维度取消旧卡或换成对应场景。');
    return {prompt:blocks.join('\n\n'),sources,errors:[...new Set(errors)],exclusions,generation_images:[],reference_policy:state.identityMode==='external'?'user_supplies_separately':'identity_keywords_only',character:character?.source||null};
  }
  function nav(k,icon,name){return `<button class="nav ${page===k?'active':''}" data-page="${k}"><i>${icon}</i>${name}</button>`;}
  function heading(en,title,sub,buttons=''){return `<div class="heading"><div><div class="eyebrow">${en}</div><h1>${title}</h1><p class="sub">${sub}</p></div><div class="top-actions">${buttons}</div></div>`;}
  function renderLegacy(){
    const names={studio:'关键词工作台',library:'拆解资料库',records:'导出记录',help:'使用与备份'};
    $('#app').innerHTML=`<div class="shell"><aside class="side"><div class="logo"><b>✳</b> 闪彩 <em>Atelier</em><small>WORDS INTO WORLDS</small></div><nav><div class="navtitle">关键词创作空间</div>${nav('studio','◈',names.studio)}${nav('library','▤',names.library)}${nav('records','◷',names.records)}<div class="navtitle">工作室</div>${nav('help','☷',names.help)}</nav><div class="sidebottom"><span class="online"></span>完整离线版 · V 2.0<br><span id="saveStatus">${memoryOnly?'临时使用 · 请导出备份':'已保存在此浏览器'}</span><div class="tagline" style="margin-top:16px">YOUR REFERENCES. YOUR STORY.</div></div></aside><main class="main"><header class="topbar"><span>闪彩工坊 &nbsp; / &nbsp; <strong>${names[page]}</strong></span><span>拆解画法 · 自由组合 · 导出使用</span></header><div class="content">${page==='studio'?studio():page==='library'?library():page==='records'?records():help()}<footer class="footer"><span>闪彩 Atelier · 关键词负责画法，参考图由你提供。</span><span>OFFLINE EDITION / 2.0</span></footer></div></main></div>`;
    bind();
  }
  function categoryBar(){return `<div class="categorybar">${Object.entries(categories).map(([k,v])=>`<button data-category="${k}" class="${category===k?'active':''}">${v} <span>${active(chosen(k)).length}</span></button>`).join('')}</div>`;}
  function render(){
    const context={esc,save,render,toast,download,openModal};
    window.CharacterStudio.init(state);window.CharacterStudio.setContext(context);
    renderLegacy();
    const menu=$('.side nav');menu.insertAdjacentHTML('afterbegin',nav('characters','♧','人物库 · '+state.characters.length));
    if(page==='characters'){
      $('.content').innerHTML=window.CharacterStudio.render(state)+'<footer class="footer">人物来源为用户附件的可见特征记录；推演不等于确认。</footer>';
      $('.topbar strong').textContent='人物身份库';
    }else if(page==='studio'){
      $('.hero').insertAdjacentHTML('beforebegin',window.CharacterStudio.controls(state));
      $('.heading .sub').textContent='先选人物与比例，再组合画法、场景和关键词。';
      $('.hero h2').innerHTML='保留她的五官，<br>再改变场景与服装。';
    }
    $('.sidebottom .online').nextSibling.textContent='人物与关键词 · V3 ';
    bind();window.CharacterStudio.bind(state,context);
  }
  function cardChoices(){return state.cards.filter(c=>c.category===category).map(c=>`<option value="${c.id}" ${state.selection[category]===c.id?'selected':''}>${esc(c.name)}</option>`).join('');}
  function keywordsPanel(){const c=chosen(category);return `<div class="panel"><div class="panelhead"><h2>${categories[category]}拆解</h2><button class="lightbtn" id="editCurrent">编辑卡片 ↗</button></div><div class="toolbar"><select id="selectCard" style="flex:1"><option value="">不使用此维度</option>${cardChoices()}</select><button class="secondary" id="newCard">＋ 新卡片</button></div>${c?`<div class="cardheader"><div class="eyebrow">${esc(c.id)} / VERSION ${c.version}</div><h2>${esc(c.name)}</h2><p>${esc(c.source)}</p><p class="title-source">逐项选择，只导出勾选的内容。观察依据与用途随 JSON 一并保留。</p></div>${c.keywords.length?c.keywords.map((k,i)=>`<div class="kwrow ${k.enabled?'':'off'}"><label><input type="checkbox" data-keyword="${i}" ${k.enabled?'checked':''}><div class="kwtext"><strong>${esc(k.part)} · ${esc(k.description_zh)}</strong><div class="english">${esc(k.prompt_en)}</div><div class="basis">依据 / ${esc(k.basis||'待补充观察依据')}</div></div></label><div class="meta"><span>${evidence[k.confidence]}</span><span>· ${k.confirmed?'人工已确认':'待人工确认'}</span><span>· ${esc(k.scope)}</span></div></div>`).join(''):`<div class="empty">身份特征是可选补充。<br>你可以在生图时自行提供人物图，无需先上传或填写人物母版。<br><button class="lightbtn" id="editEmpty">＋ 记录身份关键词</button></div>`}<div class="info">不继承：${c.exclusions.length?esc(c.exclusions.join(' / ')):'未设置排除项'}<br>保存新版本时会保留上一个版本及其词条。</div>`:'<div class="empty">此维度暂不导出。可在上方选择卡片或新建卡片。</div>'}</div>`;}
  function studio(){const result=compile();return `${heading('KEYWORD WORKSPACE','把画风，拆成可用的语言。','只需挑选和调整关键词；人物与其他参考图由你在生图时自行提供。','<button class="secondary" id="backup">↓ 备份工作空间</button>')}<div class="hero"><div><div class="eyebrow">A SMALL DETAIL. A DIFFERENT WORLD.</div><h2>保留细腻的笔触，<br>给新的故事留出空间。</h2><p>不把一张图的全部内容捆在一起。<br>画法、镜头、光照与色彩，都可以独立选择。</p><div class="statline"><span>${state.cards.length} 张拆解卡</span><span>${Object.keys(categories).length} 个独立维度</span><span>${result.sources.filter(s=>s.card_id).length} 个已选词条</span></div></div><div class="hero-mark">Aa ✧</div></div><div class="workflow"><span><b>01</b>选择拆解卡</span><span><b>02</b>勾选与精调</span><span><b>03</b>导出关键词</span><span><b>04</b>自行附图生图</span></div>${categoryBar()}<div class="keyword-layout"><section>${keywordsPanel()}<div class="panel"><div class="panelhead"><h2>人物与临时造型</h2><small>不要求上传参考图</small></div><div class="charfields"><label class="field"><span>人物输入方式</span><select data-field="identityMode"><option value="external" ${state.identityMode==='external'?'selected':''}>我会在生图时提供人物参考图</option><option value="keywords" ${state.identityMode==='keywords'?'selected':''}>只使用人物身份关键词</option></select></label><label class="field"><span>人物名称（可选）</span><input data-field="characterName" value="${esc(state.characterName)}" placeholder="角色名或自定义称呼"></label><label class="field"><span>服装中文备注</span><input data-field="outfitZh" value="${esc(state.outfitZh)}"></label><label class="field"><span>服装英文关键词</span><input data-field="outfitEn" value="${esc(state.outfitEn)}"></label></div><p class="formhelp">外部人物参考模式默认导出“只继承人物身份”的说明。参考图不会存入这个网页，也不会随文本导出。</p></div><div class="panel"><h3>补充要求与负面约束</h3><label class="field"><span>补充要求 · 中文备注</span><textarea data-field="extraZh" rows="2">${esc(state.extraZh)}</textarea></label><label class="field"><span>对应英文要求（导出内容）</span><textarea data-field="extraEn" rows="2">${esc(state.extraEn)}</textarea></label><label class="field"><span>负面约束 · 英文，可编辑</span><textarea data-field="negative" rows="3">${esc(state.negative)}</textarea></label></div></section><aside class="panel output-panel"><div class="panelhead"><h2>本次关键词组合</h2><span class="badge">实时预览</span></div><div class="selected-tags">${Object.entries(categories).filter(([cat])=>active(chosen(cat)).length).map(([cat,label])=>`<span>${label} · ${active(chosen(cat)).length}</span>`).join('')}</div><div style="margin-top:16px" id="compileStatus">${statusHtml(result)}</div><pre class="code" id="livePrompt">${esc(result.prompt)}</pre><button class="primary wide" id="exportTxt">↓ 导出完整提示词 TXT</button><div class="exporttypes"><button id="copy">复制关键词</button><button id="exportJson">结构化 JSON</button><button id="exportMd">中文拆解 MD</button></div><button class="lightbtn wide" id="viewSources">查看全部来源 →</button><p class="mini-note">使用时：复制提示词 → 打开 ChatGPT Images → 自行附上人物参考图 → 生成与核对。文字约束不能保证脸部完全一致。</p></aside></div>`;}
  function statusHtml(r){return r.errors.length?`<div class="errorbox">${r.errors.map(e=>'• '+esc(e)).join('<br>')}</div>`:'<div class="goodbox">✓ 可以导出 · 无需上传参考图<br>剧情卡为可编辑创作方案；画风拆解为人工视觉估计。</div>';}
  function library(){const cs=state.cards.filter(c=>(category==='all'||c.category===category)&&(c.name+' '+c.keywords.map(k=>k.description_zh+' '+k.prompt_en).join(' ')).toLowerCase().includes(search.toLowerCase()));return `${heading('DECOMPOSITION LIBRARY','让每个关键词，都有依据。','预置第一张风格图的画法拆解，以及明确标注的可替换创作方案。','<button class="primary" id="newCard">＋ 新建拆解卡</button>')}<div class="toolbar"><input id="search" placeholder="搜索中文分析或英文词" value="${esc(search)}"><select id="libraryCategory"><option value="all">全部维度</option>${Object.entries(categories).map(([k,v])=>`<option value="${k}" ${category===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="library-grid">${cs.map(c=>`<article class="librarycard"><span class="bigindex">${c.category==='style'?'✧':c.category==='shot'?'◈':'◇'} <small style="font:10px sans-serif">${categories[c.category]} / v${c.version}</small></span><h3>${esc(c.name)}</h3><p>${esc(c.source)}</p><div class="chips"><span class="chip">${c.keywords.length} 个词条</span><span class="chip">${c.history.length} 次修订</span></div><div class="formrow"><button class="lightbtn" data-edit="${c.id}">详细拆解 →</button><button class="secondary" data-use="${c.id}">${state.selection[c.category]===c.id?'已选用':'选用'}</button></div></article>`).join('')||'<div class="empty">没有匹配的卡片。</div>'}</div>`;}
  function records(){return `${heading('EXPORT JOURNAL','每一次导出，都有迹可循。','保存导出时的提示词、词条和卡片版本。后续修改不会改变旧记录。')}${state.records.map(r=>`<div class="panel"><div class="panelhead"><h2>${esc(r.title)}</h2><small>${new Date(r.time).toLocaleString('zh-CN')}</small></div><p class="small">${r.sources.length} 项来源 · ${r.format} · 不含图片</p><div class="record-actions"><button class="secondary" data-record="${r.id}">查看关键词与来源</button><button class="secondary" data-download-record="${r.id}">下载 JSON</button></div></div>`).join('')||'<div class="empty">从工作台导出 TXT、JSON 或 MD 后，会在这里保留记录。</div>'}`;}
  function help(){return `${heading('READY WHEN YOU ARE','下载，打开，就能用。','这是完整的离线网页；你以后无需进入 Codex，也无需启动服务器。')}<div class="panel"><h2>如何使用</h2><ol class="plain-list"><li>下载“闪彩关键词工坊.html”，用电脑上的 Chrome、Edge 或 Safari 打开。</li><li>在工作台切换维度，选择卡片，勾选需要的关键词。</li><li>点“编辑卡片”修改中英文、依据、范围和排除项。</li><li>默认选择“我会在生图时提供人物参考图”，不用上传任何图片。</li><li>导出 TXT 后，将文字复制到 ChatGPT Images，并自行附加人物参考图。</li><li>生成后对照原人物图核对脸型、眼型、五官位置与刘海。</li></ol><p class="small">手机的文件预览可能不执行网页脚本，建议下载后在支持本地 HTML 的浏览器中打开，或先用电脑查看。</p></div><div class="panel"><h2>拆解标准</h2><p>风格只记录线条、上色、阴影、高光、皮肤、头发、背景、纹理和边缘；色彩与光照独立。具体剧情、人物动机和精确笔刷无法从单张图片可靠确认时，不当成事实。</p><p class="small">当前预置画法、构图、光照与配色是对聊天第一张风格图的人工观察，没有伪造测量数据。剧情、动作、场景与替换画法是创作方案。新建卡片需要手动编辑；网页没有自动视觉分析或翻译模型。</p></div><div class="panel"><h2>备份与迁移</h2><p>编辑内容保存在当前浏览器。换浏览器、清理浏览器数据或移动文件后可能需要重新导入备份。请定期下载 JSON；导出的 TXT 只保存提示词。</p><button class="primary" id="backup">下载完整工作空间 JSON</button> <button class="secondary" id="restore">导入工作空间备份</button><p class="info">恢复前会要求确认，并先下载一份当前工作空间备份。旧版 Python 网站的数据仍保留在原 .data 目录，本版不会覆盖它。</p></div>`;}
  function openModal(title,body){$('#modal').innerHTML=`<div class="modalhead"><h2>${esc(title)}</h2><button class="close" id="closeModal" aria-label="关闭">×</button></div>${body}`;if(!$('#modal').open)$('#modal').showModal();$('#closeModal').onclick=()=>$('#modal').close();}
  function showSources(r){openModal('关键词与来源',`<pre class="code">${esc(r.prompt)}</pre><p class="small">图片输入为空；由你在目标生图工具另行提供。</p><div class="sourcewrap"><table class="source-table"><thead><tr><th>来源</th><th>版本 / 依据</th><th>内容</th></tr></thead><tbody>${r.sources.map(s=>`<tr><td>${esc(s.card_name||s.source)}<br>${esc(s.id)}</td><td>v${s.card_version||s.version||1}<br>${esc(evidence[s.confidence]||'用户设置')}</td><td>${esc(s.description_zh||s.prompt_en||s.source)}<br>${esc(s.basis||'')}</td></tr>`).join('')}</tbody></table></div>`);}
  function exportPack(format){const r=compile();if(r.errors.length){toast('请先处理预览上方的冲突或缺失项');return;}if(!r.sources.some(s=>s.card_id)){toast('至少选择一个有效关键词后再导出');return;}
    const record={...clone(r),id:id('EXPORT'),title:(state.characterName||'自备人物参考')+' · '+(chosen('style')?.name||'自由组合'),time:new Date().toISOString(),format};
    if(format==='TXT')download('闪彩-完整提示词.txt',r.prompt,'text/plain;charset=utf-8');
    if(format==='JSON')download('闪彩-关键词与来源.json',record);
    if(format==='MD')download('闪彩-中文拆解.md',markdown(r),'text/markdown;charset=utf-8');
    state.records.unshift(record);save();toast('已导出 '+format+'，并保留来源快照');
  }
  function markdown(r){return '# 闪彩关键词拆解\n\n参考图由用户自行提供；此文件不含图片。\n\n'+Object.entries(categories).map(([cat,label])=>{const c=chosen(cat);return c&&active(c).length?'## '+label+' · '+c.name+'\n\n来源：'+c.source+' / v'+c.version+'\n\n'+active(c).map(k=>'- '+k.part+'：'+k.description_zh+'\n  - English: '+k.prompt_en+'\n  - 依据：'+k.basis+'\n  - 类型：'+evidence[k.confidence]+'；范围：'+k.scope).join('\n')+'\n\n排除项：'+c.exclusions.join(', '):'';}).filter(Boolean).join('\n\n')+'\n\n## 完整英文提示词\n\n```text\n'+r.prompt+'\n```\n';}
  function createCard(){openModal('建立新的拆解卡',`<label class="field"><span>维度</span><select id="newCategory">${Object.entries(categories).map(([k,v])=>`<option value="${k}" ${k===category?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>卡片名称</span><input id="newName" style="width:100%" placeholder="例如：细线 · 透明水彩"></label><button class="primary" id="create">建立草稿</button>`);$('#create').onclick=()=>{const name=$('#newName').value.trim();if(!name)return toast('请输入名称');const cat=$('#newCategory').value,c=makeCard(id(cat.toUpperCase()),cat,name,'用户手动拆解',[]);editCard(c,true);};}
  function editCard(input,isNew=false){const c=clone(input);
    function draw(){openModal('编辑拆解 · '+c.name,`<div class="grid2"><label class="field"><span>名称</span><input id="editName" value="${esc(c.name)}"></label><label class="field"><span>来源（原图名称或你的观察记录）</span><input id="editSource" value="${esc(c.source)}"></label></div><p class="formhelp">每项只描述一个可复用特征；将原人物、服装、色彩和灯光分开。编辑草稿只有点“保存”后才会生效。</p><div id="editor">${c.keywords.map((k,i)=>`<div class="kweditor" data-index="${i}"><div class="grid2"><label class="field"><span>子项，如线条 / 上色</span><input class="part" value="${esc(k.part)}"></label><label class="field"><span>中文拆解</span><input class="zh" value="${esc(k.description_zh)}"></label></div><label class="field"><span>英文关键词</span><textarea class="en">${esc(k.prompt_en)}</textarea></label><label class="field"><span>观察依据 / 推断边界</span><textarea class="basis">${esc(k.basis)}</textarea></label><div class="grid2"><label class="field"><span>证据类型</span><select class="confidence">${Object.entries(evidence).map(([v,l])=>`<option value="${v}" ${v===k.confidence?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span>适用范围</span><input class="scope" value="${esc(k.scope)}"></label></div><label class="field"><span>冲突词条 ID（逗号分隔） · 当前 ${esc(k.id)}</span><input class="conflicts" style="width:100%" value="${esc(k.conflicts.join(', '))}"></label><div class="row"><label><input type="checkbox" class="enabled" ${k.enabled?'checked':''}>启用</label><label><input type="checkbox" class="confirmed" ${k.confirmed?'checked':''}>人工确认</label><button class="lightbtn" data-split="${i}">按 ; 拆分</button><button class="lightbtn" data-merge="${i}">合并上一项</button><button class="lightbtn danger" data-remove="${i}">删除</button></div></div>`).join('')}</div><label class="field"><span>不继承 / 排除项（逗号分隔）</span><textarea id="editExclusions" rows="2">${esc(c.exclusions.join(', '))}</textarea></label><details><summary class="small">修订历史 · ${c.history.length} 次</summary>${c.history.map(h=>`<p class="small">v${h.version} · ${esc(h.time)} · ${h.keywords.length} 项</p>`).join('')||'<p class="small">尚无修订</p>'}</details><div class="modal-actions"><button class="secondary" id="addKeyword">＋ 添加词条</button><button class="primary" id="saveCard">${isNew?'保存卡片':'保存新版本'}</button></div>`);
      const read=()=>{c.name=$('#editName').value;c.source=$('#editSource').value;c.exclusions=$('#editExclusions').value.split(',').map(s=>s.trim()).filter(Boolean);c.keywords=[...document.querySelectorAll('[data-index]')].map((el,i)=>({...c.keywords[i],part:el.querySelector('.part').value,description_zh:el.querySelector('.zh').value,prompt_en:el.querySelector('.en').value,basis:el.querySelector('.basis').value,scope:el.querySelector('.scope').value,confidence:el.querySelector('.confidence').value,enabled:el.querySelector('.enabled').checked,confirmed:el.querySelector('.confirmed').checked,conflicts:el.querySelector('.conflicts').value.split(',').map(s=>s.trim()).filter(Boolean)}));};
      $('#addKeyword').onclick=()=>{read();c.keywords.push({id:id(c.id),part:'新子项',description_zh:'',prompt_en:'',basis:'',scope:scopes[c.category],confidence:'design',enabled:true,confirmed:false,conflicts:[]});draw();};
      document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{read();c.keywords.splice(+b.dataset.remove,1);draw();});
      document.querySelectorAll('[data-split]').forEach(b=>b.onclick=()=>{read();const i=+b.dataset.split,k=c.keywords[i],parts=k.prompt_en.split(';').map(s=>s.trim()).filter(Boolean);if(parts.length<2)return toast('英文用 ; 分隔成两项后再拆分');c.keywords.splice(i,1,...parts.map((p,j)=>({...clone(k),id:id(c.id),prompt_en:p,part:k.part+' '+(j+1)})));draw();});
      document.querySelectorAll('[data-merge]').forEach(b=>b.onclick=()=>{read();const i=+b.dataset.merge;if(!i)return toast('第一项没有上一项');const prev=c.keywords[i-1],next=c.keywords[i];if(prev.scope!==next.scope||prev.confidence!==next.confidence)return toast('适用范围或证据类型不同，请先统一后合并');prev.prompt_en+='; '+next.prompt_en;prev.description_zh+=' / '+next.description_zh;prev.basis+=' / '+next.basis;prev.conflicts=[...new Set([...prev.conflicts,...next.conflicts])];prev.confirmed=prev.confirmed&&next.confirmed;c.keywords.splice(i,1);draw();});
      $('#saveCard').onclick=()=>{read();if(!c.name.trim()||c.keywords.some(k=>!k.prompt_en.trim()||!k.description_zh.trim()))return toast('请填写卡片名称及每项的中英文关键词');if(!isNew){const old=card(c.id);c.history.push({version:old.version,time:new Date().toISOString(),name:old.name,source:old.source,keywords:clone(old.keywords),exclusions:clone(old.exclusions)});c.version++;state.cards[state.cards.findIndex(x=>x.id===c.id)]=c;}else{state.cards.push(c);state.selection[c.category]=c.id;}save();$('#modal').close();render();toast('拆解已保存 · v'+c.version);};
    }draw();
  }
  function bind(){
    const on=(sel,fn)=>{if($(sel))$(sel).onclick=fn;};
    document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=b.dataset.page;if(page==='library')category='all';if(page==='studio'&&category==='all')category='style';render();window.scrollTo(0,0);});
    document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;render();});
    document.querySelectorAll('[data-keyword]').forEach(e=>e.onchange=()=>{chosen(category).keywords[+e.dataset.keyword].enabled=e.checked;save();render();});
    if($('#selectCard'))$('#selectCard').onchange=e=>{state.selection[category]=e.target.value;save();render();};
    document.querySelectorAll('[data-field]').forEach(e=>e.onchange=()=>{state[e.dataset.field]=e.value;save();const r=compile();$('#livePrompt').textContent=r.prompt;$('#compileStatus').innerHTML=statusHtml(r);});
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editCard(card(b.dataset.edit)));
    document.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{const c=card(b.dataset.use);state.selection[c.category]=c.id;category=c.category;page='studio';save();render();});
    document.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>showSources(state.records.find(r=>r.id===b.dataset.record)));
    document.querySelectorAll('[data-download-record]').forEach(b=>b.onclick=()=>download('闪彩-历史关键词.json',state.records.find(r=>r.id===b.dataset.downloadRecord)));
    on('#newCard',createCard);on('#editCurrent',()=>chosen(category)?editCard(chosen(category)):createCard());on('#editEmpty',()=>editCard(chosen(category)));
    on('#backup',()=>download('闪彩-完整工作空间.json',state));on('#restore',()=>$('#importFile').click());
    on('#exportTxt',()=>exportPack('TXT'));on('#exportJson',()=>exportPack('JSON'));on('#exportMd',()=>exportPack('MD'));on('#viewSources',()=>showSources(compile()));
    on('#copy',async()=>{const r=compile();if(r.errors.length)return toast('请先处理预览上方的冲突或缺失项');try{if(!navigator.clipboard)throw Error();await navigator.clipboard.writeText(r.prompt);toast('已复制，可自行附图使用');}catch{openModal('复制关键词',`<p class="small">浏览器限制了剪贴板，可在下方全选复制，或下载 TXT。</p><textarea id="copyText" rows="15">${esc(r.prompt)}</textarea>`);$('#copyText').select();}});
    if($('#libraryCategory'))$('#libraryCategory').onchange=e=>{category=e.target.value;render();};
    if($('#search'))$('#search').oninput=e=>{search=e.target.value;const pos=e.target.selectionStart;render();$('#search').focus();$('#search').setSelectionRange(pos,pos);};
  }
  $('#importFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>20*1024*1024)throw Error('备份超过 20 MiB，请拆分或使用较小备份');const imported=validate(JSON.parse(await file.text()));openModal('恢复工作空间',`<p>将恢复 ${imported.cards.length} 张卡片和 ${imported.records.length} 条记录。确认时会先下载当前工作空间备份。</p><button class="primary" id="confirmRestore">先备份当前内容，再恢复</button>`);$('#confirmRestore').onclick=()=>{download('闪彩-恢复前备份.json',state);state=imported;save();$('#modal').close();render();toast('工作空间已恢复');};}catch(err){toast('无法导入：'+err.message);}finally{e.target.value='';}};
  render();
})();
