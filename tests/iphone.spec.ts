import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
test.setTimeout(60_000);
const html = readFileSync('tests/fixtures/cifra-club.html', 'utf8');
const longSong = Array.from({length:80},(_,i)=>`[Parte ${i+1}]\n     Am                  E/G#\nVerso ${i+1} de uma canção fictícia\n  Dm              G7\nOutra frase para cantar!\n`).join('\n');
async function paste(page:Page, html:string, plain:string) {
  await page.locator('.cm-content').tap();
  await page.locator('.cm-content').evaluate((el,{html,plain})=>{
    const data=new DataTransfer(); data.setData('text/html',html);data.setData('text/plain',plain);
    el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  },{html,plain});
}
async function editorText(page:Page) {
  return page.locator('.cm-content').evaluate(el=>[...el.querySelectorAll('.cm-line')].map(line=>line.textContent).join('\n'));
}
async function dimensions(page:Page) {
  return page.locator('.presentation-shell').evaluate(shell=>{
    const stage=shell.querySelector('.presentation-stage') as HTMLElement;
    const bar=shell.querySelector('.presentation-controls')!;
    const rect=(el:Element)=>el.getBoundingClientRect();
    const columns=[...shell.querySelectorAll('.presentation-column')];
    const errors:string[]=[];
    if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1) errors.push('document overflow');
    if(stage.scrollWidth>stage.clientWidth+1) errors.push('stage overflow');
    if(rect(stage).bottom>rect(bar).top+1) errors.push('bar overlap');
    if(rect(bar).bottom>window.innerHeight+1) errors.push('bar outside screen');
    columns.forEach((column,i)=>{
      if(i && rect(columns[i-1]).right>rect(column).left+1) errors.push('columns overlap');
      const blocks=[...column.querySelectorAll('.presentation-block')];
      blocks.forEach((block,j)=>{
        if(block.scrollWidth>block.clientWidth+1) errors.push('block overflow');
        if(j && rect(blocks[j-1]).bottom>rect(block).top+1) errors.push('blocks overlap');
      });
    });
    return {errors, font:getComputedStyle(columns[0]).fontSize, count:columns.length, scrolls:stage.scrollHeight>stage.clientHeight,
      ids:[...shell.querySelectorAll('[data-block-id]')].map(el=>Number(el.getAttribute('data-block-id'))),
      paired:[...shell.querySelectorAll('.presentation-block')].filter(el=>el.textContent?.includes('Verso')).every(el=>el.textContent?.includes('Am'))};
  });
}
test('login local e publicado sem overflow com toque',async({page},info)=>{
  for(const url of ['/', 'https://wagnerjuniovs.github.io/sistema-cifras/']) {
    await page.goto(url);
    await expect(page.getByRole('heading',{name:'Entrar',exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Criar conta',exact:true}).tap();
    await expect(page.getByRole('heading',{name:'Criar conta'})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  }
  await page.screenshot({path:info.outputPath('login.png'),fullPage:true});
});
for(const [name,markup,plain,expected] of [
  ['HTML',html,'cópia inválida','            Em'],
  ['fragmento','   <b data-chord-name="Am">Bm</b>','inválida','   Bm'],
  ['texto limpo','','  Am\nCanção!\n\n  Am\nCanção!','  Am\nCanção!\n\n  Am\nCanção!'],
]) test('evento de colagem '+name,async({page})=>{
  await page.goto('/tests/harness.html');
  await paste(page,markup,plain);
  await expect.poll(()=>editorText(page)).toContain(expected);
  expect(await editorText(page)).not.toContain('self.__next');
  if(markup) {
    await page.getByRole('button',{name:'Desfazer',exact:true}).tap();
    expect(await editorText(page)).toBe('');
  }
});
test('correção antiga com revisão e desfazer por toque',async({page},info)=>{
  await page.goto('/tests/harness.html');
  const original='Canção!\n  ">A\nCanção!';
  await page.evaluate(content=>window.dispatchEvent(new CustomEvent('test-song',{detail:content})),original);
  await page.getByRole('button',{name:'Corrigir colagem'}).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:info.outputPath('review.png'),fullPage:true});
  await page.getByRole('button',{name:'Usar versão corrigida'}).tap();
  expect(await editorText(page)).toBe('  A\nCanção!');
  await page.getByRole('button',{name:'Desfazer',exact:true}).tap();
  expect(await editorText(page)).toBe(original);
});
test('apresentação: geometria, fonte, rolagem, rotação e saída',async({page},info)=>{
  await page.goto('/tests/harness.html');
  await page.evaluate(content=>window.dispatchEvent(new CustomEvent('test-song',{detail:content})),longSong);
  await page.getByRole('button',{name:'Apresentar fixture'}).tap();
  await expect.poll(async()=> (await dimensions(page)).errors).toEqual([]);
  const initial=await dimensions(page);
  expect(initial.scrolls).toBe(true);expect(initial.paired).toBe(true);
  expect(initial.ids).toEqual([...initial.ids].sort((a,b)=>a-b));
  await page.screenshot({path:info.outputPath('presentation.png')});
  await page.getByRole('button',{name:'Aumentar fonte',exact:true}).tap();
  await expect.poll(async()=> (await dimensions(page)).font).not.toBe(initial.font);
  await page.getByRole('button',{name:'Iniciar rolagem automática'}).tap();
  await expect.poll(()=>page.locator('.presentation-stage').evaluate(el=>el.scrollTop)).toBeGreaterThan(10);
  await page.getByRole('button',{name:'Aumentar velocidade',exact:true}).tap();
  await page.getByRole('button',{name:'Pausar rolagem automática'}).tap();
  await page.locator('.presentation-stage').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const bottom=await page.locator('.presentation-column').last().locator('.presentation-block').last().boundingBox();
  const bar=await page.locator('.presentation-controls').boundingBox();
  expect(bottom!.y+bottom!.height).toBeLessThanOrEqual(bar!.y+1);
  const current=page.viewportSize()!;
  await page.setViewportSize({width:current.height,height:current.width});
  await expect.poll(async()=> (await dimensions(page)).errors).toEqual([]);
  await page.getByRole('button',{name:'Colunas',exact:true}).tap();
  await expect.poll(async()=> (await dimensions(page)).count).toBe(1);
  await page.getByRole('button',{name:'Sair da tela cheia'}).tap();
  await expect(page.locator('.presentation-shell')).toHaveCount(0);
});
test('apresentação funciona sem API de fullscreen e com linha longa',async({page})=>{
  await page.addInitScript(()=>{Object.defineProperty(Element.prototype,'requestFullscreen',{value:undefined,configurable:true});});
  await page.goto('/tests/harness.html');
  const content='[Intro]\n    Am                      E/G#                                    Dm\nUma linha fictícia muito longa para testar a quebra musical e os acordes na mesma posição';
  await page.evaluate(content=>window.dispatchEvent(new CustomEvent('test-song',{detail:content})),content);
  await page.getByRole('button',{name:'Apresentar fixture'}).tap();
  await expect.poll(async()=> (await dimensions(page)).errors).toEqual([]);
  expect(await page.evaluate(()=>!!document.fullscreenElement)).toBe(false);
  const rendered=await page.locator('.presentation-columns').textContent();
  expect(rendered?.match(/Am|E\/G#|Dm/g)).toEqual(['Am','E/G#','Dm']);
  expect(rendered?.replace(/Am|E\/G#|Dm|\s/g,'')).toBe(content.replace(/Am|E\/G#|Dm|\s/g,''));
  await page.getByRole('button',{name:'Sair da tela cheia'}).tap();
  await expect(page.locator('.presentation-shell')).toHaveCount(0);
});
