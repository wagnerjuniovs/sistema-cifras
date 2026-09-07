import { chromium, webkit, devices } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const config=readFileSync('src/lib/firebase.ts','utf8');
const key=config.match(/apiKey: "([^"]+)"/)[1];
const project=config.match(/projectId: "([^"]+)"/)[1];
const auth=`https://identitytoolkit.googleapis.com/v1/accounts:`;
const email=`browser-${randomUUID()}@example.com`;
const password=`Test!${randomUUID()}Aa1`;
async function authCall(operation,data) {
  const response=await fetch(`${auth}${operation}?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok) throw new Error(`Authentication ${operation}: ${response.status}`);
  return response.json();
}
const account=await authCall('signUp',{email,password,returnSecureToken:true});
const root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${account.localId}`;
const headers={Authorization:`Bearer ${account.idToken}`};
const mobile = process.env.SMOKE_BROWSER === 'webkit';
const browser=await (mobile ? webkit : chromium).launch();
mkdirSync('test-results',{recursive:true});
let page;
try {
  const viewport = process.env.SMOKE_ORIENTATION === 'landscape' ? {width:896,height:414} : {width:414,height:896};
  page=await browser.newPage(mobile ? {...devices['iPhone 11'],viewport,screen:viewport} : {viewport:{width:1366,height:768}});
  await page.goto(process.env.SMOKE_URL || 'http://127.0.0.1:5173/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.locator('form').getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:'Nova cifra'}).click();
  await page.getByLabel('Nome da música').fill('Validação sintética de colagem');
  const html=readFileSync('tests/fixtures/cifra-club.html','utf8');
  await page.locator('.cm-content').evaluate((el,html)=>{
    const data=new DataTransfer(); data.setData('text/html',html);data.setData('text/plain','cópia inválida');
    el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
  },html);
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await page.locator('.song-text').waitFor();
  const saved=await page.locator('.song-text').textContent();
  if(!saved.includes('            Em') || saved.includes('self.__next') || saved.includes('inválida')) throw new Error('Saved content differs from structured paste');
  await page.reload();
  await page.locator('.song-text').waitFor();
  if(await page.locator('.song-text').textContent()!==saved) throw new Error('Reload lost content');
  await page.getByRole('button',{name:'Editar',exact:true}).click();
  await page.getByLabel('Nome da música').fill('Validação sintética revisada');
  await page.getByRole('button',{name:'Salvar',exact:true}).click();
  await page.getByRole('heading',{name:'Validação sintética revisada'}).waitFor();
  await page.screenshot({path:'test-results/saved-song.png',fullPage:true});
  await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});
  await page.getByRole('button',{name:'Imprimir / Salvar em PDF'}).click();
  if(!await page.evaluate(()=>window.__printed)) throw new Error('Print button failed');
  await page.emulateMedia({media:'print'});
  if(await page.locator('.song-actions').isVisible()) throw new Error('Print controls visible');
  if (!mobile) await page.pdf({path:'test-results/saved-song.pdf',format:'A4'});
  await page.emulateMedia({media:'screen'});
  await page.getByRole('button',{name:'Tela cheia',exact:true}).click();
  await page.locator('.presentation-stage').waitFor();
  await page.getByRole('button',{name:'Sair da tela cheia'}).click();
  await page.locator('.song-text').waitFor();
  console.log('Browser: paste, save, reload, edit, print styles and fullscreen passed.');
} catch (error) {
  if (page) {
    await page.screenshot({path:'test-results/browser-save-failure.png',fullPage:true});
    console.error(await page.locator('.form-message, .editor-error, .toast').allTextContents());
    console.error({url:page.url(), title:await page.getByLabel('Nome da música').inputValue().catch(()=>null), saves:await page.getByRole('button',{name:'Salvar',exact:true}).count()});
  }
  throw error;
} finally {
  await browser.close();
  for (const collection of ['songs','folders']) {
    const response=await fetch(`${root}/${collection}`,{headers});
    if(!response.ok) throw new Error('Could not list temporary test data for cleanup');
    const docs=(await response.json()).documents || [];
    for (const doc of docs) {
      const url=`https://firestore.googleapis.com/v1/${doc.name}`;
      if(!url.startsWith(`${root}/${collection}/`)) throw new Error('Cleanup escaped temporary user');
      if(!(await fetch(url,{method:'DELETE',headers})).ok) throw new Error('Could not delete temporary document');
    }
  }
  await fetch(root,{method:'DELETE',headers});
  await authCall('delete',{idToken:account.idToken});
  console.log('Temporary browser account and documents removed.');
}
