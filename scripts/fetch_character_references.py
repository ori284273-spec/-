"""Fetch named community reference assets, preserving original bytes and provenance."""
import base64
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import quote
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = '2426269/shinycolors-assets'
RDF = Path('/tmp/shancai-identity-research-20261105/RDFs/283.rdf')
ROSTER = [
 ('01','大崎甘奈','大崎甘奈','ALSTROEMERIA'),('02','芹沢あさひ','芹泽朝日','Straylight'),
 ('03','園田智代子','园田智代子','放学后CLIMAX GIRLS'),('04','桑山千雪','桑山千雪','ALSTROEMERIA'),
 ('05','黛冬優子','黛冬优子','Straylight'),('06','鈴木羽那','铃木羽那','CoMETIK'),
 ('07','郁田はるき','郁田阳希','CoMETIK'),('08','市川雛菜','市川雏菜','noctchill'),
 ('09','風野灯織','风野灯织','illumination STARS'),('10','西城樹里','西城树里','放学后CLIMAX GIRLS'),
 ('11','小宮果穂','小宫果穗','放学后CLIMAX GIRLS'),('12','幽谷霧子','幽谷雾子',"L'Antica"),
 ('13','月岡恋鐘','月冈恋钟',"L'Antica"),('14','福丸小糸','福丸小糸','noctchill'),
 ('15','斑鳩ルカ','斑鸠路加','CoMETIK'),('16','樋口円香','樋口圆香','noctchill'),
 ('17','田中摩美々','田中摩美美',"L'Antica"),('18','櫻木真乃','樱木真乃','illumination STARS'),
 ('19','八宮めぐる','八宫巡','illumination STARS'),('20','和泉愛依','和泉爱依','Straylight'),
 ('21','緋田美琴','绯田美琴','SHHis'),('22','有栖川夏葉','有栖川夏叶','放学后CLIMAX GIRLS'),
 ('23','七草にちか','七草日花','SHHis'),('24','杜野凛世','杜野凛世','放学后CLIMAX GIRLS'),
 ('25','白瀬咲耶','白濑咲耶',"L'Antica"),('26','大崎甜花','大崎甜花','ALSTROEMERIA'),
 ('27','浅倉透','浅仓透','noctchill'),('28','三峰結華','三峰结华',"L'Antica")
]

def get(url):
    cache=Path('/tmp/shancai-reference-fetch-cache');cache.mkdir(exist_ok=True)
    file=cache/hashlib.sha256(url.encode()).hexdigest()
    if file.exists():return file.read_bytes()
    data=subprocess.check_output(['curl','-L','--fail','--retry','2','--retry-delay','1','--max-time','45','-sS',url])
    file.write_bytes(data)
    return data

def paths(path):
    html = get('https://github.com/'+REPO+'/tree/main/'+quote(path, safe='/')).decode()
    return sorted(set(json.loads(s) for s in re.findall(r'"path":("(?:[^"\\]|\\.)*")',html)))

def main():
    ns={'s':'http://schema.org/','r':'http://www.w3.org/1999/02/22-rdf-syntax-ns#','i':'https://sparql.crssnky.xyz/imasrdf/URIs/imas-schema.ttl#'}
    names={}
    for e in ET.parse(RDF).getroot():
        data={}
        for n in e.findall('s:name',ns): data[n.attrib.get('{http://www.w3.org/XML/1998/namespace}lang')]=n.text
        if 'ja' in data:
            kana=e.find('i:nameKana',ns);height=e.find('s:height',ns);official=e.find('i:IdolListURL',ns)
            names[data['ja']]={'jp':data['ja'],'roman':data.get('en',''),'kana':kana.text if kana is not None else '', 'heightCm':float(height.text) if height is not None else None,'officialUrl':official.attrib.get('{'+ns['r']+'}resource','') if official is not None else ''}
    tree=Path('/tmp/shancai-reference-tree.txt').read_text().splitlines()
    cdn_tree=set(Path('/tmp/shancai-cdn-tree.txt').read_text().splitlines())
    units={u:sorted(set('/'.join(p.split('/')[:3]) for p in tree if p.startswith('人物立绘/'+u+'/'))) for u in set(r[3] for r in ROSTER)}
    output=ROOT/'static'/'references';output.mkdir(exist_ok=True)
    def one(row):
        num,jp,zh,unit=row
        candidates=units[unit]
        # Repository names use Chinese variants, which can differ from Japanese kanji.
        aliases={jp,zh}
        extra={'郁田はるき':'郁田阳希','斑鳩ルカ':'斑鸠路加','七草にちか':'七草にちか','芹沢あさひ':'芹泽朝日','八宮めぐる':'八宫巡'}
        aliases.add(extra.get(jp,jp))
        folder=next((p for p in candidates if p.rsplit('/',1)[-1] in aliases),None)
        if not folder:
            print('UNMATCHED',jp,candidates,flush=True);return {'id':'CHAR-'+num,**names[jp],'zh':zh,'unit':unit,'images':[],'unmatched':candidates}
        files=[p for p in tree if p.startswith(folder+'/') and p.count('/')==3 and p.lower().endswith(('.png','.jpg','.webp'))]
        files.sort(key=lambda p:('profile' not in p.lower(),p))
        images=[]
        portrait='角色头像/'+zh+'.webp'
        if portrait not in cdn_tree:raise ValueError('Missing named portrait '+portrait)
        cards=sorted(p for p in cdn_tree if p.startswith('角色卡面/') and p.endswith(' '+jp+'.webp'))
        cards.sort(key=lambda p:('アイドルロード' not in p,p))
        if not cards:raise ValueError('Missing named illustration '+jp)
        profile_files=[p for p in files if 'profile' in p.lower()][:1]
        other_files=[p for p in files if p not in profile_files][:1]
        choices=[(REPO,p) for p in profile_files]+[('2426269/shinycolors-assets-cdn',cards[0]),('2426269/shinycolors-assets-cdn',portrait)]+[(REPO,p) for p in other_files]
        for index,(repo,p) in enumerate(choices):
            url='https://raw.githubusercontent.com/'+repo+'/main/'+quote(p,safe='/')
            raw=get(url)
            with Image.open(io.BytesIO(raw)) as im:
                im.verify();width,height=im.size;mime=Image.MIME[im.format]
            suffix=Path(p).suffix;filename='CHAR-'+num+'-'+str(index)+suffix
            (output/filename).write_bytes(raw)
            label='角色原始头像（低分辨率识别图）' if p.startswith('角色头像/') else ('原始角色卡面（服装和场景不纳入身份）' if p.startswith('角色卡面/') else ('角色介绍立绘' if 'profile' in p.lower() else '演出服立绘'))
            images.append({'path':'references/'+filename,'url':url,'filename':p.rsplit('/',1)[-1], 'sha256':hashlib.sha256(raw).hexdigest(),'width':width,'height':height,'mime':mime,'label':label,'view':'原图可见角度，非生成侧面','lowResolution':min(width,height)<128})
        aliases={'郁田はるき':['郁田春希','郁田阳希'],'斑鳩ルカ':['斑鸠路加','斑鸠露卡','斑鸠露加'],'芹沢あさひ':['芹泽朝日','芹泽朝阳'],'七草にちか':['七草日花'],'八宮めぐる':['八宫巡']}.get(jp,[])
        result={'id':'CHAR-'+num,**names[jp],'zh':zh,'aliases':aliases,'unit':unit,'images':images,'nameSource':'https://github.com/imas/imasparql/blob/c99dbae293ad1facce8c5015db6989e4e8c21630/RDFs/283.rdf','assetSource':'https://github.com/'+REPO+'/tree/main/'+quote(folder,safe='/'),'matchStatus':'角色名来自社区数据，立绘与用户附件人工比对','translationStatus':'中文显示名为参考译名；日文保留原名'}
        print(result['id'],jp,zh,len(images),'images',flush=True);return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        result=list(pool.map(one,ROSTER))
    (output/'catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    failures=[r for r in result if not r['images']]
    if failures:raise SystemExit('Unresolved references: '+', '.join(r['jp'] for r in failures))
    inline={}
    for r in result:
        inline[r['id']]={**r,'images':[{**i,'data':'data:'+i['mime']+';base64,'+base64.b64encode((ROOT/'static'/i['path']).read_bytes()).decode()} for i in r['images']]}
    (ROOT/'static'/'reference-data.js').write_text('window.CharacterReferences = '+json.dumps(inline,ensure_ascii=False)+';\n')
    print('COMPLETE',len(result),'characters',sum(len(r['images']) for r in result),'original images',flush=True)

if __name__=='__main__':main()
