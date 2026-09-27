"""Browser DOM + UI/adapter tests; records native blockers instead of pretending they passed.
Runtime app files remain unmodified. Browser API shims exist only in this test harness.
Run: python tests/e2e/run.py  (requires Playwright + a Chromium executable).
"""
from __future__ import annotations
import urllib.parse
import base64, copy, io, zipfile, functools, http.server, json, os, re, shutil, socketserver, subprocess, sys, tempfile, threading, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
REPORTS = ROOT / 'reports'
REPORTS.mkdir(exist_ok=True)
OFFLINE = (ROOT/'dist/小师弟求职-资料维护.html').read_text()
EXAMPLE = json.loads((ROOT/'tests/fixtures/example-profile.json').read_text())
TEMPLATE = json.loads((ROOT/'tests/fixtures/full-template-profile.json').read_text())
ENGINE = (ROOT/'extension/bridge/fill-engine.js').read_text().replace('export function createFillEngine', 'function createFillEngine')
FORM = (ROOT/'tests/fixtures/form.html').read_text()
results, opened = [], []
browser = None

SHIM = r"""
const __memory = new Map();
Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>__memory.get(k)??null,setItem:(k,v)=>__memory.set(k,String(v)),removeItem:k=>__memory.delete(k),clear:()=>__memory.clear()}});
Object.defineProperty(navigator,'locks',{configurable:true,value:{request:async(k,fn)=>fn()}});
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t;}}});
if(!crypto.randomUUID)crypto.randomUUID=()=>{const a=crypto.getRandomValues(new Uint8Array(16));a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const s=Array.from(a,x=>x.toString(16).padStart(2,'0')).join('');return s.slice(0,8)+'-'+s.slice(8,12)+'-'+s.slice(12,16)+'-'+s.slice(16,20)+'-'+s.slice(20);};
window.__downloads=[];const originalURL=URL.createObjectURL;URL.createObjectURL=b=>{window.__downloads.push({blob:b});return originalURL(b);};
HTMLAnchorElement.prototype.click=function(){if(this.download&&window.__downloads.length)window.__downloads.at(-1).name=this.download;};
window.__fixtureState={profile:__SEED__,history:[],epoch:0};
localStorage.setItem('applydock.profile.v1',JSON.stringify(window.__fixtureState));
"""
CHROME = r"""
window.__runtimeListeners=[];window.__storageListeners=[];window.__mockTarget=null;window.__mockUndo=false;window.__runtimeCalls=[];
window.chrome={runtime:{id:'test-only-extension',openOptionsPage:async()=>{window.__openedManager=true;},onMessage:{addListener:f=>__runtimeListeners.push(f)},sendMessage:async r=>{
 window.__runtimeCalls.push(structuredClone(r));
 try{let data;switch(r.type){
 case 'LOAD':data={profile:structuredClone(__fixtureState.profile),epoch:__fixtureState.epoch};break;
 case 'SAVE':if(r.rev!==__fixtureState.profile.revision||r.epoch!==__fixtureState.epoch)return {ok:false,error:'另一窗口已更新资料',code:'CONFLICT'};
   if(r.checkpoint)__fixtureState.history.unshift({profile:structuredClone(__fixtureState.profile),label:r.checkpoint,at:new Date().toISOString()});__fixtureState.profile=structuredClone(r.profile);__fixtureState.profile.revision=r.rev+1;__fixtureState.profile.updatedAt=new Date().toISOString();data={profile:structuredClone(__fixtureState.profile),epoch:__fixtureState.epoch};break;
 case 'STATUS':data={tabId:9,origin:'https://careers.example.test',target:window.__mockTarget,undoAvailable:window.__mockUndo};break;
 case 'CONNECT':data={tabId:9};break;
 case 'FILL':if(!__mockTarget||r.token!==__mockTarget.token||r.tabId!==9)throw new Error('目标已变化');data=await window.__testEngine.fill(r.token,r.value);window.__mockUndo=true;break;
 case 'UNDO_FILL':data=await window.__testEngine.undo();window.__mockUndo=false;break;
 case 'HISTORY':data=structuredClone(__fixtureState.history);break;
 case 'ERASE':throw new Error('This shim intentionally does not model erase; use real repository unit tests.');
 default:throw new Error('Unsupported test message '+r.type);
 }return {ok:true,data};}catch(e){return {ok:false,error:e.message};}
}},storage:{onChanged:{addListener:f=>__storageListeners.push(f),removeListener:f=>{}}}};
"""

def check(condition, message='assertion failed'):
    if not condition:
        raise AssertionError(message)

def case(name, fn, scope='browser-dom'):
    start=time.perf_counter()
    try:
        fn();results.append({'name':name,'status':'passed','scope':scope,'seconds':round(time.perf_counter()-start,3)})
        print('PASS',name,flush=True)
    except Exception as exc:
        trace=traceback.format_exc()
        results.append({'name':name,'status':'failed','scope':scope,'error':str(exc),'traceback':trace,'seconds':round(time.perf_counter()-start,3)})
        print('FAIL',name,str(exc)[:180],flush=True)
        if opened:
            try: opened[-1].screenshot(path=str(REPORTS/f'failure-{len(results):02d}.png'))
            except Exception: pass
    finally:
        for page in opened:
            try: page.context.close()
            except Exception: pass
        opened.clear()

def blank(width=1440, height=1000):
    context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce')
    page=context.new_page();page.set_default_timeout(3500);opened.append(page)
    page._app_errors=[]
    page.on('pageerror',lambda error:page._app_errors.append(str(error)))
    return page

def app(profile=None, panel=False, width=1440, height=1000):
    seed=copy.deepcopy(profile or EXAMPLE)
    page=blank(width,height)
    # about:blank is an opaque origin under this sandbox's navigation restrictions.
    # Mock origin-bound storage, locks, clipboard/download dispatch. DOM/CSS/app code are real.
    shim=SHIM.replace('__SEED__',json.dumps(seed,ensure_ascii=True).replace('<',r'\u003c'))+(CHROME if panel else '')
    html=OFFLINE.replace('<body data-view="manager">',f'<body data-view="{"panel" if panel else "manager"}"><script>{shim}</script>')
    page.set_content(html,wait_until='load')
    page.locator('.module-nav').wait_for()
    return page

def stored(page):
    return page.evaluate("JSON.parse(localStorage.getItem('applydock.profile.v1')).profile")

def choose_file(page, name, data, mime='application/json'):
    with page.expect_file_chooser() as chooser:
        page.get_by_role('button',name='导入',exact=True).click()
    chooser.value.set_files({'name':name,'mimeType':mime,'buffer':data},timeout=15000)

def wait_condition(page, expression, timeout=4000):
    deadline=time.monotonic()+timeout/1000
    while time.monotonic()<deadline:
        if page.evaluate(expression): return
        page.wait_for_timeout(40)
    raise AssertionError('Condition timed out: '+expression)

def wait_saved(page):
    wait_condition(page,"document.querySelector('.save-state').textContent==='已保存'")

def select_module(page,name):
    page.get_by_role('button',name=name,exact=True).click()

def last_blob(page):
    return base64.b64decode(page.evaluate("async()=>{const a=new Uint8Array(await __downloads.at(-1).blob.arrayBuffer());let s='';for(const b of a)s+=String.fromCharCode(b);return btoa(s)}"))

def export_profile(page, which='xlsx'):
    page.get_by_role('button',name='导出',exact=True).click()
    page.get_by_role('button',name='Excel · 按分类整理' if which=='xlsx' else '普通备份 · JSON',exact=True).click()
    page.get_by_role('button',name='确认导出',exact=True).click()
    wait_condition(page,'window.__downloads.length>0')
    return last_blob(page)

def fixture():
    page=blank()
    page.set_content(FORM,wait_until='load')
    page.add_script_tag(content=SHIM.replace('__SEED__',json.dumps(EXAMPLE))+ENGINE+"\nwindow.__target=null;window.__testEngine=createFillEngine(window,t=>window.__target=t);window.__submits=0;document.getElementById('form').addEventListener('submit',e=>{e.preventDefault();window.__submits++;});")
    return page

def write(page, selector, value):
    page.locator(selector).click()
    token=page.evaluate('window.__target?.token')
    return page.evaluate("async([token,value])=>{try{return {ok:true,data:await __testEngine.fill(token,value)}}catch(e){return {ok:false,error:e.message}}}",[token,value])

def run_cases():
    def rendering():
        p=app();check(not p._app_errors,str(p._app_errors));check(p.get_by_label('姓名',exact=True).input_value()=='林知夏');check(p.locator('.nav-item').count()==8)
        p.screenshot(path=str(REPORTS/'manager-basic.png'),full_page=True)
    case('manager renders seeded profile with labeled controls',rendering,'ui-with-memory-storage')

    def autosave():
        p=app();value='  测试名字 🚀  ';p.get_by_label('姓名',exact=True).fill(value);wait_saved(p);check(stored(p)['modules'][0]['entries'][0]['fields'][0]['value']==value)
    case('autosave preserves raw Unicode and surrounding spaces',autosave,'ui-with-memory-storage')

    def custom():
        p=app();p.get_by_role('button',name='添加分类',exact=True).click();p.get_by_role('button',name='新建自定义分类',exact=True).click();p.get_by_label('分类名称',exact=True).fill('开源贡献');p.get_by_role('button',name='保存',exact=True).click();p.get_by_role('button',name='添加字段',exact=True).click()
        p.get_by_label('字段名称',exact=True).fill('合并 PR');p.get_by_label('字段分组',exact=True).fill('个人贡献');p.get_by_label('内容类型',exact=True).select_option('multiline');p.get_by_role('dialog').get_by_role('button',name='添加字段',exact=True).click();value='• PR #001\n→ 修复边界条件 🚀';p.get_by_label('合并 PR',exact=True).fill(value);wait_saved(p);m=stored(p)['modules'][-1];check(m['name']=='开源贡献');check(m['entries'][0]['fields'][-1]['value']==value);check(m['entries'][0]['fields'][-1]['group']=='个人贡献')
    case('custom module and custom grouped multiline field can be created and edited',custom,'ui-with-memory-storage')

    def rename_module():
        p=app();before=stored(p)['modules'][0]['id'];p.get_by_role('button',name='分类设置',exact=True).click();p.get_by_label('分类名称',exact=True).fill('我的个人信息');p.get_by_role('button',name='保存',exact=True).click();wait_saved(p);m=stored(p)['modules'][0];check(m['id']==before and m['name']=='我的个人信息')
    case('module rename preserves its stable identity',rename_module,'ui-with-memory-storage')

    def duplicate():
        p=app();select_module(p,'工作经历');p.get_by_role('button',name='记录操作：示例科技 · 产品经理',exact=True).click();p.get_by_role('button',name='复制这段经历（含内容）',exact=True).click();wait_saved(p);m=next(m for m in stored(p)['modules'] if m['templateKey']=='work');a,b=m['entries'];check(a['id']!=b['id']);check(a['fields'][0]['id']!=b['fields'][0]['id']);check([f['value'] for f in a['fields']]==[f['value'] for f in b['fields']])
    case('duplicate entry keeps content and assigns independent IDs',duplicate,'ui-with-memory-storage')

    def collapsing():
        p=app();p.locator('.record-toggle').first.click();check(p.locator('.record-collapse').first.evaluate('(e)=>e.inert'));check(p.locator('.record').first.get_attribute('data-open')=='false')
        p.locator('.record-toggle').first.click();check(not p.locator('.record-collapse').first.evaluate('(e)=>e.inert'))
    case('entry collapse is animated and removes hidden fields from keyboard navigation',collapsing,'ui-with-memory-storage')

    def search():
        p=app();p.get_by_label('搜索全部资料',exact=True).fill('求职资料助手');p.locator('.search-result-count').wait_for();check(p.locator('.record-title').filter(has_text='求职资料助手').count()>0)
    case('global search traverses modules and entries',search,'ui-with-memory-storage')

    def sensitive():
        seed=copy.deepcopy(EXAMPLE);f=seed['modules'][0]['entries'][0]['fields'][0];f['sensitive']=True;f['value']='PRIVATE-98765'
        p=app(seed,panel=True,width=380);check('PRIVATE-98765' not in p.locator('#app').inner_text());p.get_by_label('搜索全部资料',exact=True).fill('PRIVATE-98765');p.get_by_text('没有找到相关资料',exact=True).wait_for();check(p.get_by_text('没有找到相关资料',exact=True).is_visible());p.get_by_label('搜索全部资料',exact=True).fill('');p.get_by_role('button',name='查看 姓名',exact=True).click();check(p.get_by_role('dialog',name='确认使用敏感信息').is_visible());p.get_by_role('button',name='确认继续',exact=True).click();check(p.locator('.full-text').inner_text()=='PRIVATE-98765')
    case('sensitive values are masked, excluded from search, and revealed only after consent',sensitive,'ui-with-mocked-chrome')

    def longtext():
        seed=copy.deepcopy(EXAMPLE);f=seed['modules'][0]['entries'][0]['fields'][0];value='• 中文 → résumé 🚀\n'.__mul__(80);f['value']=value
        p=app(seed,panel=True,width=360);p.get_by_role('button',name='查看 姓名',exact=True).click();check(p.locator('.full-text').inner_text()==value)
    case('long sidebar preview has access to exact full text',longtext,'ui-with-mocked-chrome')

    def xss():
        seed=copy.deepcopy(EXAMPLE);value='<img src=x onerror="window.PWNED=1"><script>window.PWNED=1</script>';seed['modules'][0]['entries'][0]['fields'][0]['value']=value;p=app(seed,panel=True,width=380);check(p.locator('img').count()==0);check(not p.evaluate('window.PWNED'));check(value in p.locator('#app').inner_text())
    case('profile markup is displayed as text without creating HTML or executing scripts',xss,'ui-with-mocked-chrome')

    def import_cancel():
        p=app();before=stored(p);choose_file(p,'blank.json',json.dumps(TEMPLATE).encode());p.get_by_role('dialog',name='导入预览').wait_for();p.get_by_role('button',name='取消，不导入',exact=True).click();check(stored(p)==before)
    case('canceling an import leaves persisted data untouched',import_cancel,'ui-with-memory-storage')

    def import_json():
        p=app();choose_file(p,'template.json',json.dumps(TEMPLATE).encode());p.get_by_role('button',name='确认替换资料',exact=True).click();wait_saved(p);after=stored(p);check(after['modules']==TEMPLATE['modules']);state=p.evaluate("JSON.parse(localStorage.getItem('applydock.profile.v1'))");check(len(state['history'])==1)
    case('confirmed JSON import replaces only after preview and checkpoints prior data',import_json,'ui-with-memory-storage')

    def bad_json():
        p=app();before=stored(p);choose_file(p,'invalid.json',b'{bad');p.get_by_text('JSON 不是有效文本，未导入任何数据。',exact=True).wait_for();check(stored(p)==before)
    case('malformed JSON does not partially change current data',bad_json,'ui-with-memory-storage')

    def oversized():
        p=app();before=stored(p);choose_file(p,'large.json',b' '* (8*1024*1024+1));p.get_by_text('文件超过 8 MB，请拆分或删除不需要的内容后导入。',exact=True).wait_for();check(stored(p)==before)
    case('oversized file is rejected before parsing',oversized,'ui-with-memory-storage')

    def xlsx_roundtrip():
        seed=copy.deepcopy(EXAMPLE);f=seed['modules'][0]['entries'][0]['fields'][0];f['value']=' 0013800000000\r\n• → 🚀\t=1+1\n_x000D_\n<x>&\"\'  '
        p=app(seed);data=export_profile(p);check(data[:2]==b'PK');(REPORTS/'runtime-export-test.xlsx').write_bytes(data);choose_file(p,'roundtrip.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');p.get_by_role('button',name='确认替换资料',exact=True).click();wait_saved(p);check(stored(p)['modules']==seed['modules'])
    case('real browser XLSX writer and parser preserve IDs, strings, CRLF, XML text and escape-like literals',xlsx_roundtrip,'ui-with-memory-storage')

    def external_xlsx():
        p=app();data=(ROOT/'tests/fixtures/independent-template.xlsx').read_bytes();choose_file(p,'external-template.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');p.get_by_role('button',name='确认替换资料',exact=True).click();wait_saved(p);after=stored(p);check(after['modules']==TEMPLATE['modules']);check(len(after['modules'])==20)
    case('independent artifact_tool load-edit-save XLSX imports with all 230 fields',external_xlsx,'ui-with-memory-storage')

    def workbook_attack(kind):
        p=app();before=stored(p)
        with zipfile.ZipFile(io.BytesIO((REPORTS/'runtime-export-test.xlsx').read_bytes())) as z:
            files={n:z.read(n) for n in z.namelist()}
        if kind in ['formula','number']:
            original=files['xl/worksheets/sheet1.xml'].decode()
            cell='<c r="C3" t="n">'+('<f>1+1</f>' if kind=='formula' else '')+'<v>123</v></c>'
            changed,count=re.subn(r'<c r="C3"[^>]*>.*?</c>',lambda _:cell,original,count=1,flags=re.S);check(count==1)
            files['xl/worksheets/sheet1.xml']=changed.encode()
        elif kind=='entity':
            original=files['xl/worksheets/sheet1.xml'].decode();files['xl/worksheets/sheet1.xml']=original.replace('?>','?><!DOCTYPE worksheet [<!ENTITY unsafe "blocked">]>',1).encode()
        elif kind=='macro':files['xl/vbaProject.bin']=b'not executable test bytes'
        elif kind=='path':files['../outside.xml']=b'test'
        data=io.BytesIO()
        with zipfile.ZipFile(data,'w',zipfile.ZIP_DEFLATED) as z:
            for name,value in files.items():z.writestr(name,value)
        choose_file(p,'negative.xlsx',data.getvalue(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        p.locator('.toast.error').wait_for();check(stored(p)==before);check(p.get_by_role('dialog',name='导入预览').count()==0)
    for kind in ['formula','number','entity','macro','path']:
        case(f'XLSX parser rejects {kind} workbook without changing current profile',lambda k=kind:workbook_attack(k),'ui-with-memory-storage')

    def mismatch():
        p=app();p.get_by_role('button',name='导出',exact=True).click();p.get_by_role('button',name='加密备份',exact=True).click();p.get_by_label('备份口令',exact=True).fill('long-password-123');p.get_by_label('再次输入口令',exact=True).fill('different-password-456');p.get_by_role('button',name='加密并导出',exact=True).click();check(p.get_by_text('两次输入的口令不一致。',exact=True).is_visible());check(p.evaluate('__downloads.length')==0)
    case('backup passphrase mismatch blocks export',mismatch,'ui-with-memory-storage')

    def conflict():
        p=app();p.evaluate("(()=>{let s=JSON.parse(localStorage.getItem('applydock.profile.v1'));s.profile.revision++;s.profile.name='Other window';localStorage.setItem('applydock.profile.v1',JSON.stringify(s));})()");p.get_by_label('姓名',exact=True).fill('保留这份草稿');p.locator('.global-error').wait_for(state='visible');check(p.get_by_label('姓名',exact=True).input_value()=='保留这份草稿');check(stored(p)['name']=='Other window');data=export_profile(p,'json');check(json.loads(data)['modules'][0]['entries'][0]['fields'][0]['value']=='保留这份草稿')
    case('concurrent revision conflict retains user draft and allows exporting it',conflict,'ui-with-memory-storage')

    def erase():
        p=app();p.get_by_role('button',name='设置与帮助',exact=True).click();p.locator('.advanced-settings summary').click();p.get_by_role('button',name='清除本机全部资料',exact=True).click();p.get_by_label('输入「删除」确认',exact=True).fill('删除');p.get_by_role('button',name='保存',exact=True).click();p.get_by_text('本机保存的资料与历史版本已清除。',exact=True).wait_for();s=p.evaluate("JSON.parse(localStorage.getItem('applydock.profile.v1'))");check(s['profile']['modules']==[] and s['history']==[] and s['epoch']==1)
    case('explicit permanent erase clears profile and local history',erase,'ui-with-memory-storage')

    for width in [320,360,420,600,800]:
        def responsive(w=width):
            p=app(panel=True,width=w,height=950);select_module(p,'工作经历');p.wait_for_timeout(200);check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow at {w}');check(p.locator('#app').evaluate('(e)=>e.scrollWidth<=e.clientWidth'));check(not p._app_errors,str(p._app_errors));p.screenshot(path=str(REPORTS/f'sidepanel-{w}.png'))
        case(f'sidebar layout has no horizontal overflow at {width}px',responsive,'ui-with-mocked-chrome')
    for width in [360,768,1440]:
        def responsive_manager(w=width):
            p=app(width=w,height=1000);select_module(p,'工作经历');p.wait_for_timeout(100);check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'));check(not p._app_errors,str(p._app_errors));p.screenshot(path=str(REPORTS/f'manager-{w}.png'))
        case(f'manager layout has no horizontal overflow at {width}px',responsive_manager,'ui-with-memory-storage')

    def controlled():
        p=fixture();p.evaluate("(()=>{const e=document.getElementById('controlled'),d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let tracked='';Object.defineProperty(e,'value',{get(){return d.get.call(this)},set(v){tracked=String(v);d.set.call(this,v)}});e.addEventListener('input',()=>{if(tracked!==e.value){window.controlledState=e.value;tracked=e.value;}})})()");r=write(p,'#controlled','00123');check(r['ok'],r);check(p.evaluate('window.controlledState')=='00123')
    case('native setter updates controlled-input value tracker fixture (not a React library test)',controlled)

    def ordinary():
        p=fixture();r=write(p,'#name','林知夏');check(r['ok'],r);check(p.locator('#name').input_value()=='林知夏');check(p.evaluate('__submits')==0)
    case('native text field fills exact value and never submits the form',ordinary)

    def multiline():
        p=fixture();value='1、第一行\r\n• 第二行 → 🚀\n  两个空格';r=write(p,'#duties',value);check(r['ok'],r);check(p.locator('#duties').input_value()==value.replace('\r\n','\n'))
    case('textarea preserves symbols and line structure; browser line endings normalize to LF',multiline)

    def select_exact():
        p=fixture();check(write(p,'#city','北京')['ok']);check(p.locator('#city').input_value()=='bj')
    case('native select matches an exact option label',select_exact)

    def ambiguous():
        p=fixture();before=p.locator('#ambiguous').input_value();r=write(p,'#ambiguous','重复');check(not r['ok']);check(p.locator('#ambiguous').input_value()==before)
    case('ambiguous select labels do not guess or overwrite',ambiguous)

    def limited():
        p=fixture();r=write(p,'#limited','too long');check(not r['ok']);check(p.locator('#limited').input_value()=='old')
    case('maxlength overflow is rejected without truncation or mutation',limited)

    def date_invalid():
        p=fixture();r=write(p,'#date','2026/09/23');check(not r['ok']);check(p.locator('#date').input_value()=='')
    case('date formatting that would be changed by the control is rejected',date_invalid)

    def date_valid():
        p=fixture();r=write(p,'#date','2026-09-23');check(r['ok'],r);check(p.locator('#date').input_value()=='2026-09-23')
    case('canonical native date input accepted',date_valid)

    for selector in ['#password','#upload','#readonly','#disabled','#hidden','#rich']:
        def blocked(s=selector):
            p=fixture();p.evaluate('(s)=>__testEngine.select(document.querySelector(s))',s);check(p.evaluate('__target') is None)
        case(f'unsafe or unsupported control is not a fill target: {selector}',blocked)

    def removed():
        p=fixture();p.locator('#name').click();token=p.evaluate('__target.token');p.locator('#name').evaluate('(e)=>e.remove()');r=p.evaluate("async t=>{try{await __testEngine.fill(t,'new');return true}catch{return false}}",token);check(not r)
    case('detached form target cannot receive a stale fill',removed)

    def wrong_token():
        p=fixture();p.locator('#name').click();r=p.evaluate("async()=>{try{await __testEngine.fill('stale','new');return true}catch{return false}}");check(not r);check(p.locator('#name').input_value()=='原有内容')
    case('wrong focus token is rejected before changing the field',wrong_token)

    def cancel_beforeinput():
        p=fixture();p.locator('#name').evaluate("e=>e.addEventListener('beforeinput',e=>e.preventDefault())");r=write(p,'#name','new');check(not r['ok']);check(p.locator('#name').input_value()=='原有内容')
    case('canceled beforeinput aborts the write',cancel_beforeinput)

    def undo():
        p=fixture();check(write(p,'#name','new')['ok']);p.evaluate('__testEngine.undo()');check(p.locator('#name').input_value()=='原有内容')
    case('last fill can be undone without submitting',undo)

    def undo_changed():
        p=fixture();check(write(p,'#name','new')['ok']);p.locator('#name').fill('user modification');r=p.evaluate("async()=>{try{await __testEngine.undo();return true}catch{return false}}");check(not r);check(p.locator('#name').input_value()=='user modification')
    case('undo refuses to overwrite a later user edit',undo_changed)

    def editor():
        p=fixture();value='Hello\n• 中文 🚀 <script>not executable</script>';r=write(p,'#editable',value);check(r['ok'],r);check(p.locator('#editable').inner_text()==value);check(p.locator('#editable script').count()==0);p.evaluate('__testEngine.undo()');check(p.locator('#editable').inner_text()=='旧的描述')
    case('simple contenteditable preserves multiline literal text and supports undo',editor)

    def shadow():
        p=fixture();p.locator('#shadow-host').evaluate("e=>{const r=e.attachShadow({mode:'open'});const input=document.createElement('input');input.id='shadow-input';input.setAttribute('aria-label','Shadow field');r.append(input)}");r=write(p,'#shadow-input','Shadow text');check(r['ok'],r);check(p.locator('#shadow-input').input_value()=='Shadow text')
    case('open shadow-root native input can be selected and filled',shadow)

    def rerender():
        p=fixture();p.locator('#name').evaluate("e=>e.addEventListener('input',()=>{const replacement=e.cloneNode();replacement.value='server reset';e.replaceWith(replacement)})");r=write(p,'#name','new');check(not r['ok']);check(p.locator('#name').input_value()=='server reset')
    case('framework replacement/reset is reported as failure, not claimed success',rerender)

    def integration():
        # Two separate browser documents preserve distinct focus contexts, unlike a
        # same-document iframe imitation of Chrome's native side panel. Transport is
        # still explicitly mocked; this does NOT validate native side-panel focus.
        site=fixture();original=site.locator('#name').input_value();site.locator('#name').click();target=site.evaluate('__target')
        p=app(panel=True,width=420,height=1000)
        # Promise queue models asynchronous Chrome messaging. The test driver pumps
        # one message to the other document; no page code or focus checks are bypassed.
        p.evaluate("t=>{window.__mockTarget={...t,tabId:9,origin:'https://careers.example.test'};window.__pending=null;window.__testEngine={fill:(t,v)=>new Promise(resolve=>{window.__resolve=resolve;window.__pending={operation:'fill',token:t,value:v}}),undo:()=>new Promise(resolve=>{window.__resolve=resolve;window.__pending={operation:'undo'}})};for(const listener of __runtimeListeners)listener({type:'TARGET_UPDATED'});}",target)
        def pump():
            wait_condition(p,'window.__pending!==null');request=p.evaluate('__pending')
            if request['operation']=='fill':result=site.evaluate('async([t,v])=>__testEngine.fill(t,v)',[request['token'],request['value']])
            else:result=site.evaluate('async()=>__testEngine.undo()')
            p.evaluate('result=>{window.__pending=null;window.__resolve(result)}',result)
        p.get_by_text('填入：姓名',exact=True).wait_for();p.get_by_role('button',name='填入 姓名',exact=True).click();pump()
        wait_condition(site,"document.getElementById('name').value==='林知夏'")
        wait_condition(p,"!document.querySelector('[aria-label=\"撤回上次填写\"]').disabled")
        p.screenshot(path=str(REPORTS/'adapter-integration-panel.png'))
        p.get_by_role('button',name='撤回上次填写',exact=True).click();pump();check(site.locator('#name').input_value()==original)
        calls=p.evaluate("__runtimeCalls.filter(x=>x.type==='FILL')");check(len(calls)==1 and calls[0]['value']=='林知夏');check('profile' not in calls[0]);check(not p._app_errors,p._app_errors)
    case('sidebar click routes one field to a separate real DOM and supports undo (Chrome transport mocked)',integration,'ui-adapter-integration-mocked-chrome')

    def disabled_fieldset():
        p=fixture();p.locator('#name').evaluate("e=>{const f=document.createElement('fieldset');f.disabled=true;e.before(f);f.append(e)}");p.evaluate("__testEngine.select(document.getElementById('name'))");check(p.evaluate('__target') is None)
    case('controls inherited-disabled through a fieldset are rejected',disabled_fieldset)

    def changed_focus():
        p=fixture();p.locator('#name').click();old=p.evaluate('__target.token');p.locator('#phone').click();r=p.evaluate("async t=>{try{await __testEngine.fill(t,'wrong');return true}catch{return false}}",old);check(not r);check(p.locator('#name').input_value()=='原有内容')
    case('focus change inside the site rejects the prior target token',changed_focus)

    def offline_network():
        p=blank();requests=[];p.on('request',lambda r:requests.append(r.url));shim=SHIM.replace('__SEED__',json.dumps(EXAMPLE));p.set_content(OFFLINE.replace('<body data-view="manager">','<body data-view="manager"><script>'+shim+'</script>'));p.locator('.module-nav').wait_for();p.get_by_label('姓名',exact=True).fill('No telemetry');wait_saved(p);check(not [u for u in requests if u.startswith(('http:','https:'))],requests)
    case('normal app edit flow initiates no HTTP or HTTPS requests',offline_network,'ui-with-memory-storage')

def main():
    global browser
    native={'navigation':'not-run','extension_load':'not-run','clipboard':'mocked by harness','downloads':'Blob creation and filename dispatch captured; OS download not validated'}
    with sync_playwright() as pw:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or None
        launch={'headless':True,'args':['--no-sandbox']}
        if exe: launch['executable_path']=exe
        browser=pw.chromium.launch(**launch)
        native['browser_version']=browser.version
        handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(ROOT))
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
        threading.Thread(target=server.serve_forever,daemon=True).start()
        probe=browser.new_page()
        try:
            probe.goto(f'http://127.0.0.1:{server.server_port}/dist/'+urllib.parse.quote('小师弟求职-资料维护.html'),timeout=3000)
            probe.locator('.module-nav').wait_for(timeout=3000)
            native['navigation']='passed'
        except Exception as error:
            native['navigation']='blocked';native['navigation_error']=str(error).split('\n')[0]
        probe.close();server.shutdown();server.server_close()
        try:
            with tempfile.TemporaryDirectory(prefix='applydock-native-probe-') as directory:
                kwargs={'headless':True,'args':['--no-sandbox',f'--disable-extensions-except={ROOT / "dist/extension"}',f'--load-extension={ROOT / "dist/extension"}'],'ignore_default_args':['--disable-extensions']}
                if exe: kwargs['executable_path']=exe
                context=pw.chromium.launch_persistent_context(directory,**kwargs)
                context.pages[0].wait_for_timeout(900)
                native['extension_load']='passed' if context.service_workers else 'blocked-or-not-loaded'
                if context.service_workers: native['service_worker_url']=context.service_workers[0].url
                context.close()
        except Exception as error:
            native['extension_load']='blocked';native['extension_error']=str(error).split('\n')[0]
        run_cases()
        browser.close()
    report={'source_sha256':subprocess.check_output(['node',str(ROOT/'scripts/fingerprint.mjs')],text=True).strip(),'product':'小师弟求职','version':'1.1.0-rc.1','generated_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'environment':native,'scope_notice':'Real Chromium DOM/CSS and production UI/DOM-adapter code. Origin storage, Web Locks, clipboard, download dispatch and Chrome extension APIs are shimmed in the UI harness. This is NOT proof of native extension, real React/Vue libraries, real corporate recruiting portals or store approval.','counts':{'passed':sum(r['status']=='passed' for r in results),'failed':sum(r['status']=='failed' for r in results),'total':len(results)},'results':results,'release_blockers':['Native side panel, activeTab grant and storage trust boundaries need verification in an unrestricted browser.','Real account flows on ByteDance / Alibaba / Meituan have not been tested.','Payment, licensing, merchant identity, public privacy-policy hosting and store review are not completed.','No real user usability, payment-intent or commercial conversion study has been conducted.']}
    (REPORTS/'browser-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report['counts'],ensure_ascii=False),flush=True)
    return 1 if report['counts']['failed'] else 0
if __name__=='__main__':
    raise SystemExit(main())
