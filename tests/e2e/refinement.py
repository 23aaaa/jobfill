"""Refinement/adversarial regression. Reuses explicit UI storage/Chrome shims.
No native Chrome, real-site or human usability claims are made by this harness.
"""
import run as base
import copy,json,time,shutil,os,subprocess,zipfile,io,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=base.ROOT;R=ROOT/'reports';R.mkdir(exist_ok=True)
check=base.check;case=base.case;app=base.app;wait=base.wait_condition
PALETTES=[('蓝色','blue','#0d74ce'),('青绿','teal','#008573'),('紫色','violet','#6550b9'),('玫红','ruby','#ca244d'),('暖棕','bronze','#7d5e54'),('石墨','slate','#60646c')]
metrics=[]
def settings(p):p.get_by_role('button',name='设置与帮助',exact=True).click()
def close_settings(p):p.get_by_role('button',name='完成',exact=True).click()
def search(p,text):p.get_by_label('搜索全部资料',exact=True).fill(text);p.get_by_label('搜索全部资料',exact=True).press('Enter')
def reject_unchanged(p,data):
    before=base.stored(p);base.choose_file(p,'bad.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    p.locator('.toast.error').wait_for();check(base.stored(p)==before);check(not p.get_by_role('dialog',name='导入预览',exact=True).count())
def mutate_xlsx(data,part,fn):
    out=io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as z,zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as target:
        for n in z.namelist():target.writestr(n,fn(z.read(n).decode()).encode() if n==part else z.read(n))
    return out.getvalue()
def cases():
    for name,key,color in PALETTES:
        def theme(name=name,key=key,color=color):
            p=app(width=900);before=base.stored(p);settings(p);p.get_by_role('button',name=name,exact=True).click()
            check(p.locator('html').get_attribute('data-theme')==key)
            check(p.get_by_role('button',name=name,exact=True).get_attribute('aria-pressed')=='true')
            check(p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()") == color)
            check(p.evaluate("JSON.parse(localStorage.getItem('xiaoshidi.ui.v1')).theme")==key)
            close_settings(p);settings(p);check(p.get_by_role('button',name=name,exact=True).get_attribute('aria-pressed')=='true')
            check(base.stored(p)==before)
            if key=='teal':p.screenshot(path=str(R/'settings-themes.png'))
        case('theme '+key+': live colors, selected state, stored preference, profile unchanged',theme,'ui-refinement-mocked-storage')
    def prefs_reopen():
        p=app();settings(p);p.get_by_role('button',name='紫色',exact=True).click();close_settings(p)
        pref=p.evaluate("localStorage.getItem('xiaoshidi.ui.v1')")
        q=base.blank(800,900);shim=base.SHIM.replace('__SEED__',json.dumps(base.EXAMPLE))+f"localStorage.setItem('xiaoshidi.ui.v1',{json.dumps(pref)});"
        q.set_content(base.OFFLINE.replace('<body data-view="manager">','<body data-view="manager"><script>'+shim+'</script>'))
        q.locator('.module-nav').wait_for();check(q.locator('html').get_attribute('data-theme')=='violet')
    case('theme persists on a fresh app boot with saved preference',prefs_reopen,'ui-refinement-mocked-storage')
    def badprefs():
        p=app();p.evaluate("localStorage.setItem('xiaoshidi.ui.v1','{bad');window.dispatchEvent(new StorageEvent('storage',{key:'xiaoshidi.ui.v1'}))")
        check(p.locator('html').get_attribute('data-theme')=='blue');check(not p._app_errors,p._app_errors)
    case('malformed preferences fall back without modifying profile',badprefs)
    def single_search():
        p=app();check(p.locator('input[type=search]').count()==1);p.keyboard.press('Control+k');check(p.get_by_label('搜索全部资料').evaluate('e=>e===document.activeElement'))
        search(p,'示例科技');check(p.locator('.search-path').count()>0);p.get_by_label('搜索全部资料').press('Escape');check(p.get_by_label('搜索全部资料').input_value()=='');check(p.locator('.search-path').count()==0)
    case('one global search, Ctrl K focus and Escape restoration',single_search)
    def crosssearch():
        profile=copy.deepcopy(base.EXAMPLE);f=profile['modules'][-1]['entries'][0]['fields'][0];f.update(label='API 回归',value='Ｒｅａｃｔ testing 🚀',sensitive=False)
        p=app(profile=profile);search(p,'react 回归');check(p.get_by_label('API 回归',exact=True).count()==1)
        check(p.locator('.nav-item.active').count()==0)
        p.get_by_role('button',name='基本信息',exact=True).click();check(p.get_by_label('搜索全部资料').input_value()=='');check(p.get_by_label('姓名',exact=True).count()==1)
    case('global multi-term NFKC search and navigation restores selected module',crosssearch)
    def ime():
        p=app();s=p.get_by_label('搜索全部资料');s.dispatch_event('compositionstart');s.fill('不存在');p.wait_for_timeout(150)
        check(p.locator('.search-path').count()==0);check(p.get_by_label('姓名',exact=True).count()==1)
        s.dispatch_event('compositionend');wait(p,"document.querySelector('.search-result-count')?.textContent.includes('0')")
        s.press('Escape');check(p.get_by_label('姓名',exact=True).count()==1)
    case('IME composition does not run half-composed searches',ime)
    def secret():
        prof=copy.deepcopy(base.EXAMPLE);prof['modules'][0]['entries'][0]['fields'].append({'id':'fdsecret1','label':'私密项目','group':'常用资料','value':'S3CR3TUNIQUE','type':'text','sensitive':True})
        p=app(profile=prof,panel=True,width=420);search(p,'S3CR3TUNIQUE');check(p.get_by_role('button',name='填入 私密项目',exact=True).count()==0)
        search(p,'私密项目');check(p.get_by_role('button',name='填入 私密项目',exact=True).count()==1);check('S3CR3TUNIQUE' not in p.locator('body').inner_text())
    case('global search never exposes secret values, labels remain findable',secret)
    def hidden_controls():
        p=app(panel=True,width=420);n=p.locator('.panel-field').count();settings(p)
        cb=p.get_by_label('显示尚未填写的项目');cb.check();close_settings(p);check(p.locator('.panel-field').count()>n)
        settings(p);p.get_by_role('button',name='使用与隐私',exact=True).click();p.get_by_role('dialog',name='使用与隐私说明').wait_for();check('本地存储不等于加密' in p.get_by_role('dialog').inner_text())
    case('rare empty-field and help actions remain available from settings',hidden_controls)
    for panel,width in [(True,320),(True,360),(True,420),(True,600),(False,360),(False,768),(False,1440)]:
        def layout(panel=panel,width=width):
            p=app(panel=panel,width=width,height=900)
            check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            for cls in ['.topbar','.sidebar','.workspace','.record-list']:
                b=p.locator(cls).bounding_box();check(b['x']>=-1 and b['x']+b['width']<=width+1,(cls,b))
            b=p.locator('.record-list').bounding_box();metrics.append({'view':'panel' if panel else 'manager','width':width,'height':900,'list':b,'area_ratio':round(b['width']*b['height']/(width*900),4)})
            for el in p.locator('.topbar button:visible').all():
                q=el.bounding_box();check(q['width']>=24 and q['height']>=24,q)
            p.screenshot(path=str(R/f'refined-{"panel" if panel else "manager"}-{width}.png'))
            p.get_by_role('button',name='展开或收起分类').click();check(p.locator('.sidebar').bounding_box()['width']<=50);check(p.get_by_role('button',name='基本信息',exact=True).count()==1)
            p.get_by_role('button',name='展开或收起分类').click();check(not p._app_errors,p._app_errors)
        case(f'layout {"panel" if panel else "manager"} {width}px: viewport, 24px targets and collapsible nav',layout)
    def longlabels():
        prof=copy.deepcopy(base.EXAMPLE);m=prof['modules'][0];m['name']='非常长的自定义分类'*10;m['entries'][0]['title']=('VeryLongRecordName'*10)[:120];f=m['entries'][0]['fields'][0];f['label']='超长字段名称'*20;f['value']='a'*30000+'\n  ↗ 🙂  '
        p=app(profile=prof,panel=True,width=320,height=900);check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        check(p.get_by_role('button',name='填入 '+f['label'],exact=True).count()==1);check(p.get_by_role('button',name='查看 '+f['label'],exact=True).count()==1)
        p.get_by_role('button',name='查看 '+f['label'],exact=True).click();check(p.locator('.full-text').text_content()==f['value']);check(p.get_by_role('dialog').bounding_box()['width']<=320)
    case('120-character labels and 30k text stay bounded with full text accessible',longlabels)
    def zoom():
        p=app(width=720,height=900);p.evaluate("document.documentElement.style.fontSize='26px'");check(p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        p.get_by_label('姓名',exact=True).fill('文字放大测试');base.wait_saved(p);check(base.stored(p)['modules'][0]['entries'][0]['fields'][0]['value']=='文字放大测试')
    case('large root text does not block editing or introduce page overflow (not native browser zoom)',zoom)
    def stabletarget():
        p=app(panel=True,width=420);b=p.get_by_role('button',name='重新连接',exact=True);b.focus();p.wait_for_timeout(1800)
        check(b.evaluate('e=>e===document.activeElement'))
    case('unchanged target polling retains keyboard focus',stabletarget)
    def keyboardfield():
        p=app();p.get_by_label('姓名',exact=True).focus();btn=p.get_by_role('button',name='设置字段：姓名',exact=True)
        btn.focus();check(btn.evaluate("e=>getComputedStyle(e).opacity==='1'"));p.keyboard.press('Enter');p.get_by_role('dialog',name='设置字段',exact=True).wait_for()
    case('field settings hidden visually remain keyboard reachable',keyboardfield)
    def legacy():
        p=app();base.choose_file(p,'旧版.xlsx',(ROOT/'tests/fixtures/legacy-template.xlsx').read_bytes(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        p.get_by_role('dialog',name='导入预览').wait_for();p.get_by_role('button',name='确认替换资料',exact=True).click();base.wait_saved(p)
        check(base.stored(p)['modules']==base.TEMPLATE['modules'])
    case('original v1 workbook remains fully importable after format upgrade',legacy)
    def structure():
        p=app();data=base.export_profile(p)
        z=zipfile.ZipFile(io.BytesIO(data));book=z.read('xl/workbook.xml').decode();sheet=z.read('xl/worksheets/sheet1.xml').decode()
        check('state="hidden"' in book and '_小师弟结构' in book);check('min="4" max="8"' in sheet and 'hidden="1"' in sheet)
        check(all(x in sheet for x in ['分组','项目','填写内容']));check('state="frozen"' in sheet);check('<f>' not in sheet)
    case('user Excel has three visible columns, hidden structure, text cells and freeze pane',structure)
    def rename_roundtrip():
        p=app();data=base.export_profile(p);p2=base.stored(p)
        data=mutate_xlsx(data,'xl/workbook.xml',lambda s:s.replace('name="基本信息"','name="我的信息"'))
        data=mutate_xlsx(data,'xl/worksheets/sheet1.xml',lambda s:s.replace('林知夏','从 Excel 修改'))
        base.choose_file(p,'edited.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');p.get_by_role('dialog',name='导入预览').wait_for();p.get_by_role('button',name='确认替换资料',exact=True).click();base.wait_saved(p)
        actual=base.stored(p);check(actual['modules'][0]['name']=='我的信息');check(actual['modules'][0]['id']==p2['modules'][0]['id']);check(actual['modules'][0]['entries'][0]['fields'][0]['value']=='从 Excel 修改')
    case('edited worksheet tab and visible cell import with identities intact',rename_roundtrip)
    def no_partial():
        p=app();data=base.export_profile(p);data=mutate_xlsx(data,'xl/worksheets/sheet1.xml',lambda s:s.replace('>姓名<','><'));reject_unchanged(p,data)
    case('malformed human worksheet does not partially overwrite profile',no_partial)
    def copied_record():
        p=app();data=base.export_profile(p);old=base.stored(p)
        def copy_rows(s):
            section=re.search(r'<sheetData>(.*?)</sheetData>',s,re.S).group(1);rows=re.findall(r'<row\b.*?</row>',section,re.S);delta=len(rows)-1
            block=''.join(re.sub(r'(\br="[A-Z]*)(\d+)(")',lambda m:m[1]+str(int(m[2])+delta)+m[3],r) for r in rows[1:])
            return s.replace('</sheetData>',block+'</sheetData>')
        data=mutate_xlsx(data,'xl/worksheets/sheet1.xml',copy_rows)
        base.choose_file(p,'copy.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');p.get_by_role('dialog',name='导入预览').wait_for();p.get_by_role('button',name='确认替换资料',exact=True).click();base.wait_saved(p)
        es=base.stored(p)['modules'][0]['entries'];check(len(es)==2);check(es[0]['id']!=es[1]['id']);check(es[0]['fields'][0]['value']==es[1]['fields'][0]['value'])
    case('copied Excel record block becomes an independent entry without user-managed IDs',copied_record)
    def stress():
        prof=copy.deepcopy(base.EXAMPLE);m=prof['modules'][0];f=m['entries'][0]['fields'][0];m['entries']=[{'id':'stress-e-'+str(i),'title':'经历 '+str(i),'fields':[{**f,'id':f'stress-f-{i}-{j}','label':f'字段{j}','value':f'内容{i}-{j}'} for j in range(50)]} for i in range(100)]
        p=app(profile=prof,width=1100);check(p.locator('.edit-field').count()<200);start=time.perf_counter();search(p,'内容99-49');p.get_by_label('字段49',exact=True).wait_for();elapsed=time.perf_counter()-start
        check(elapsed<5,elapsed);check(p.get_by_label('字段49',exact=True).count()==1);metrics.append({'5000_field_search_seconds':round(elapsed,3)})
    case('global search finds one record among 5000 fields without freezing the UI',stress)
    def pagination():
        prof=copy.deepcopy(base.EXAMPLE);f=prof['modules'][0]['entries'][0]['fields'][0]
        prof['modules'][0]['entries'][0]['fields']=[{**f,'id':'page-f-'+str(i),'label':'检索项'+str(i),'value':'共同内容'} for i in range(450)]
        p=app(profile=prof,width=1100);search(p,'共同内容');check(p.locator('.edit-field').count()==200);check('450' in p.locator('.search-result-count').inner_text())
        p.get_by_role('button',name='显示更多结果').click();check(p.locator('.edit-field').count()==400)
        p.get_by_role('button',name='显示更多结果').click();check(p.locator('.edit-field').count()==450);check(p.get_by_role('button',name='显示更多结果').count()==0)
    case('broad search reveals all 450 matches in bounded batches without silent truncation',pagination)
    def work_visual():
        prof=copy.deepcopy(base.EXAMPLE);m=next(m for m in prof['modules'] if m['templateKey']=='work')
        for i in range(2):
            e=copy.deepcopy(m['entries'][0]);e['id']=f'visual-e-{i}';e['title']=['示例工作室 · 产品实习生','示例团队 · 项目助理'][i]
            for j,f in enumerate(e['fields']):f['id']=f'visual-f-{i}-{j}'
            m['entries'].append(e)
        p=app(profile=prof,panel=True,width=420,height=900);p.get_by_role('button',name='工作经历',exact=True).click();check(p.locator('.record').count()==3);p.screenshot(path=str(R/'refined-panel-work.png'))
        q=app(profile=prof,width=1440,height=900);q.get_by_role('button',name='工作经历',exact=True).click();check(q.locator('.record').count()==3);q.screenshot(path=str(R/'refined-manager-work.png'))
        check(not p._app_errors and not q._app_errors)
    case('work-experience compact layout renders three independent records',work_visual)

def main():
    with sync_playwright() as pw:
        base.browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox'])
        version=base.browser.version;cases();base.browser.close()
    report={'product':'小师弟求职','version':'1.1.0-rc.1','source_sha256':subprocess.check_output(['node',str(ROOT/'scripts/fingerprint.mjs')],text=True).strip(),'generated_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'browser':version,'counts':{'total':len(base.results),'passed':sum(r['status']=='passed' for r in base.results),'failed':sum(r['status']=='failed' for r in base.results)},'scope':'Real UI/DOM with explicit origin storage, Chrome transport, clipboard and download shims; no native or real-company claims. OOXML edits are adversarial fixtures, not Excel/WPS UI interaction.','results':base.results,'metrics':metrics}
    (R/'refinement-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report['counts']),flush=True);return bool(report['counts']['failed'])
if __name__=='__main__':raise SystemExit(main())
