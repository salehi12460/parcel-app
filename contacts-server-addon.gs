/** افزونه سرور مخاطبین برای «مرسولات پستی» */
const CONTACTS_SHEET = 'Contacts';

function contactsSheet_(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if(!ss) throw new Error('اسکریپت باید به Google Sheet سرور متصل باشد.');
  let sh = ss.getSheetByName(CONTACTS_SHEET);
  if(!sh){
    sh = ss.insertSheet(CONTACTS_SHEET);
    sh.getRange(1,1,1,6).setValues([['id','name','phone','createdAt','updatedAt','device']]);
  }
  return sh;
}
function contactsJson_(o){
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function contactsNormalize_(v){
  return String(v||'').replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g,'');
}
function contactsRead_(){
  const sh=contactsSheet_(), last=sh.getLastRow();
  if(last<2) return [];
  const rows=sh.getRange(2,1,last-1,6).getValues();
  const map={};
  rows.forEach(r=>{
    const phone=contactsNormalize_(r[2]); if(!phone) return;
    const x={id:String(r[0]||phone),name:String(r[1]||''),phone,createdAt:r[3]||'',updatedAt:r[4]||'',device:String(r[5]||'')};
    const old=map[phone];
    if(!old || (!old.name && x.name) || String(x.updatedAt)>String(old.updatedAt)) map[phone]=x;
  });
  return Object.values(map);
}
function contactsWrite_(list){
  const sh=contactsSheet_();
  if(sh.getLastRow()>1) sh.getRange(2,1,sh.getLastRow()-1,6).clearContent();
  const rows=(list||[]).map(c=>[String(c.id||''),String(c.name||''),contactsNormalize_(c.phone),String(c.createdAt||''),String(c.updatedAt||new Date().toISOString()),String(c.device||'')]).filter(r=>r[2]);
  if(rows.length) sh.getRange(2,1,rows.length,6).setValues(rows);
}
function doGet(e){
  try{
    if(String(e.parameter.action||'')!=='pullContacts') return contactsJson_({ok:true,contacts:contactsRead_()});
    return contactsJson_({ok:true,contacts:contactsRead_()});
  }catch(err){ return contactsJson_({ok:false,error:String(err)}); }
}
function doPost(e){
  try{
    const raw=e.postData&&e.postData.contents||'{}';
    const data=JSON.parse(raw);
    if(String(data.action||'')!=='saveContacts') return contactsJson_({ok:false,error:'unknown action'});
    const incoming=Array.isArray(data.contacts)?data.contacts:[];
    const current=contactsRead_();
    const map={};
    current.forEach(c=>map[contactsNormalize_(c.phone)]=c);
    incoming.forEach(c=>{
      const phone=contactsNormalize_(c.phone); if(!phone)return;
      const old=map[phone];
      const x={id:String(c.id||phone),name:String(c.name||''),phone,createdAt:String(c.createdAt||old&&old.createdAt||new Date().toISOString()),updatedAt:String(c.updatedAt||new Date().toISOString()),device:String(data.device||'')};
      if(!old || String(x.updatedAt)>=String(old.updatedAt)) map[phone]=x;
    });
    contactsWrite_(Object.values(map));
    return contactsJson_({ok:true,count:Object.keys(map).length});
  }catch(err){ return contactsJson_({ok:false,error:String(err)}); }
}
