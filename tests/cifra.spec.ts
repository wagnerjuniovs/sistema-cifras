import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
const html=readFileSync('tests/fixtures/cifra-club.html','utf8');
async function text(page: Page) { return page.locator('.cm-content').evaluate(el => Array.from(el.querySelectorAll('.cm-line')).map(line => line.textContent).join('\n')); }
async function paste(page: Page, html: string, plain: string) {
  await page.locator('.cm-content').focus();
  await page.locator('.cm-content').evaluate((el, {html,plain}) => {
    const data=new DataTransfer(); data.setData('text/html',html); data.setData('text/plain',plain);
    el.dispatchEvent(new ClipboardEvent('paste',{ clipboardData:data,bubbles:true,cancelable:true }));
  },{html,plain});
}
test.beforeEach(async ({page}) => { await page.goto('/tests/harness.html'); });
for (const [name, markup, plain, expected] of [
  ['HTML completo',html,'cópia ruim','            Em'],
  ['fragmento pre','<pre data-chord-content="true"><div class="kvMV">  <b data-chord-name="Am">Bm</b><br>Letra</div></pre>','ruim','  Bm\nLetra'],
  ['sem pre','   <b data-chord-name="A">A</b>','ruim','   A'],
  ['texto simples','','  Am\nCanção!','  Am\nCanção!'],
  ['Banana Cifras','<div>texto comum</div>','[Refrão]\n    Am   E\nCoração!\n\n[Refrão]\n    Am   E\nCoração!','[Refrão]\n    Am   E\nCoração!\n\n[Refrão]\n    Am   E\nCoração!'],
  ['wrappers','','  ">Bm ">E/G#','  Bm E/G#'],
  ['negrito','','            **Am**','            Am'],
]) test('colagem '+name, async ({page}) => {
  await paste(page,markup,plain);
  await expect.poll(() => text(page)).toContain(expected);
  const value=await text(page);
  expect(value).not.toContain('self.__next_f'); expect(value).not.toContain('\">');
  if(markup===html) expect(value.match(/Linha fictícia/g)).toHaveLength(1);
});
test('correção antiga, prévia, manter original e desfazer',async({page})=>{
  const broken='Canção!\n  ">A\nCanção!';
  await page.evaluate(value=>window.dispatchEvent(new CustomEvent('test-song',{detail:value})),broken);
  await page.getByRole('button',{name:'Corrigir colagem'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button',{name:'Manter original'}).click();
  expect(await text(page)).toBe(broken);
  await page.getByRole('button',{name:'Corrigir colagem'}).click();
  await page.getByRole('button',{name:'Usar versão corrigida'}).click();
  expect(await text(page)).toBe('  A\nCanção!');
  await page.getByRole('button',{name:'Desfazer',exact:true}).click();
  expect(await text(page)).toBe(broken);
});
test('colagem automática pode ser desfeita pelo teclado', async({page})=>{
  await paste(page,html,'ruim');
  await expect(page.getByText('Colagem do Cifra Club formatada',{exact:false})).toBeVisible();
  await page.locator('.cm-content').focus();
  await page.keyboard.press('Control+z');
  expect(await text(page)).toBe('');
});

const song=Array.from({length:160},(_,i)=>`[Parte ${i+1}]\n     Am                  E/G#\nVerso ${String(i+1).padStart(2,'0')} de uma canção fictícia\n  Dm              G7\nOutra frase para cantar!\n`).join('\n');
async function geometry(page:Page) {
  return page.locator('.presentation-shell').evaluate(shell=>{
    const stage=shell.querySelector('.presentation-stage') as HTMLElement;
    const controls=shell.querySelector('.presentation-controls')!;
    const columns=[...shell.querySelectorAll('.presentation-column')];
    const rect=(el:Element)=>el.getBoundingClientRect();
    const violations:string[]=[];
    if(stage.scrollWidth>stage.clientWidth+1) violations.push('horizontal stage');
    if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1) violations.push('horizontal document');
    if(rect(stage).bottom>rect(controls).top+1) violations.push('controls cover stage');
    columns.forEach((column,i)=>{
      if(i && rect(columns[i-1]).right>rect(column).left+1) violations.push('columns overlap');
      const blocks=[...column.querySelectorAll('.presentation-block')];
      blocks.forEach((block,j)=>{
        if(j && rect(blocks[j-1]).bottom>rect(block).top+1) violations.push('blocks overlap');
        if(block.scrollWidth>block.clientWidth+1) violations.push('block overflows');
      });
    });
    return { violations, ids:[...shell.querySelectorAll('[data-block-id]')].map(el=>Number(el.getAttribute('data-block-id'))),
      scrolls:stage.scrollHeight>stage.clientHeight, columns:columns.length, font:getComputedStyle(columns[0]).fontSize,
      paired:[...shell.querySelectorAll('.presentation-block')].filter(el=>el.textContent?.includes('Verso')).every(el=>el.textContent?.includes('Am')) };
  });
}
for (const [width,height] of [[1366,768],[1920,1080],[2560,1440],[390,844],[844,390]]) {
  test(`tela cheia ${width}x${height}`,async({page},testInfo)=>{
    await page.setViewportSize({width,height});
    await page.evaluate(value=>window.dispatchEvent(new CustomEvent('test-song',{detail:value})),song);
    await page.getByRole('button',{name:'Apresentar fixture'}).click();
    await expect(page.locator('.presentation-stage')).toBeVisible();
    await expect.poll(async()=> (await geometry(page)).violations).toEqual([]);
    const initial=await geometry(page);
    expect(initial.ids).toEqual([...initial.ids].sort((a,b)=>a-b));
    expect(initial.paired).toBe(true); expect(initial.scrolls).toBe(true);
    if(width>=1366) expect(initial.columns).toBeGreaterThan(1);
    await page.screenshot({path:testInfo.outputPath('presentation.png')});
    await page.getByRole('button',{name:'Aumentar fonte',exact:true}).click();
    await expect.poll(async()=> (await geometry(page)).font).not.toBe(initial.font);
    expect((await geometry(page)).violations).toEqual([]);
    await page.getByRole('button',{name:'Iniciar rolagem automática'}).click();
    await expect.poll(()=>page.locator('.presentation-stage').evaluate(el=>el.scrollTop)).toBeGreaterThan(10);
    await page.getByRole('button',{name:'Pausar rolagem automática'}).click();
    await page.locator('.presentation-stage').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    const last=await page.locator('.presentation-column').last().locator('.presentation-block').last().boundingBox();
    const bar=await page.locator('.presentation-controls').boundingBox();
    expect(last!.y+last!.height).toBeLessThanOrEqual(bar!.y+1);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:width>1000?900:520,height:700,deviceScaleFactor:1,mobile:false});
    await expect.poll(async()=> (await geometry(page)).violations).toEqual([]);
    await page.getByRole('button',{name:'Colunas',exact:true}).click();
    await expect.poll(async()=> (await geometry(page)).columns).toBe(1);
    await page.getByRole('button',{name:'Sair da tela cheia'}).click();
    await expect(page.locator('.presentation-shell')).toHaveCount(0);
  });
}
test('linha longa mantém conteúdo e não invade a próxima coluna',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const content='[Intro]\n    Am                      E/G#                                    Dm\nUma linha fictícia muito longa para testar a quebra musical e os acordes na mesma posição\ne|--0--2--|\nB|--1-----|';
  await page.evaluate(value=>window.dispatchEvent(new CustomEvent('test-song',{detail:value})),content);
  await page.getByRole('button',{name:'Apresentar fixture'}).click();
  await expect.poll(async()=> (await geometry(page)).violations).toEqual([]);
  const rendered=await page.locator('.presentation-columns').textContent();
  expect(rendered?.match(/Am|E\/G#|Dm/g)).toEqual(['Am','E/G#','Dm']);
  expect(rendered?.replace(/Am|E\/G#|Dm|\s/g,'')).toBe(content.replace(/Am|E\/G#|Dm|\s/g,''));
});

test('clipboard nativo preserva HTML e ignora recursos externos', async({page,context})=>{
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  const requests:string[]=[];
  page.on('request',request=>{if(request.url().includes('clipboard-resource.invalid')) requests.push(request.url());});
  await page.evaluate(async html=>{
    await navigator.clipboard.write([new ClipboardItem({
      'text/html':new Blob([html+'<img src="https://clipboard-resource.invalid/pixel" onerror="window.badClipboard=true">'],{type:'text/html'}),
      'text/plain':new Blob(['ruim'],{type:'text/plain'}),
    })]);
  },html);
  await page.locator('.cm-content').focus();
  await page.keyboard.press('Control+v');
  await expect.poll(()=>text(page)).toContain('            Em');
  expect(requests).toEqual([]);
  expect(await page.evaluate(()=>Reflect.get(window,'badClipboard'))).toBeUndefined();
  await page.screenshot({path:'test-results/native-clipboard.png',fullPage:true});
});

test('visualização normal e impressão permanecem disponíveis após resize', async({page})=>{
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('test-song',{detail:'[Intro]\n  Am\nCanção de teste!'})));
  await page.getByRole('button',{name:'Visualizar fixture'}).click();
  await page.setViewportSize({width:1366,height:768});
  await expect(page.locator('.presentation-shell')).toHaveCount(0);
  await expect(page.locator('.song-text')).toContainText('  Am');
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.song-actions')).toBeHidden();
  await expect(page.locator('.song-text')).toBeVisible();
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Tela cheia',exact:true}).click();
  await expect(page.locator('.presentation-stage')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.presentation-shell')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Imprimir / Salvar em PDF'})).toBeVisible();
});
